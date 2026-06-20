#!/usr/bin/env bash
# --- EasyDev Support AI Tenant Recovery and Integrity CLI ---
set -euo pipefail

COMMAND=${1:-}
TENANT_ID=${2:-}
PATH_ARG=${3:-}

DB_CONTAINER="support-ai-postgres"
DB_USER=${DB_USER:-"support_ai_prod"}
DB_NAME=${DB_NAME:-"easydev_support_ai_prod"}
DB_PASSWORD=${DB_PASSWORD:-"prod_db_pass_extremely_secure_991823"}
BACKUP_PASSPHRASE=${BACKUP_PASSPHRASE:-"extremely_secure_passphrase_key_ring_9921"}

export PGPASSWORD="${DB_PASSWORD}"

# Helper function to run query
run_query() {
    local sql=$1
    if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "${sql}"
    else
        psql -U "${DB_USER}" -d "${DB_NAME}" -h localhost -t -A -c "${sql}"
    fi
}

if [ -z "${COMMAND}" ] || [ -z "${TENANT_ID}" ]; then
    echo "[TENANT-RECOVERY] [ERROR] Command and Tenant UUID must be provided."
    echo "Usage: $0 [export|import|validate] [TENANT_ID] [FILE_PATH/OUTPUT_DIR]"
    exit 1
fi

case "${COMMAND}" in
    export)
        OUTPUT_DIR=${PATH_ARG:-"/tmp/tenant_exports/${TENANT_ID}"}
        mkdir -p "${OUTPUT_DIR}"
        echo "[TENANT-RECOVERY] Beginning selective export for tenant: ${TENANT_ID}..."
        
        # 1. Fetch all tables in schema containing a tenant_id column
        TABLE_QUERY="SELECT table_name FROM information_schema.columns WHERE table_schema = 'ai_support_agent' AND column_name = 'tenant_id';"
        TABLES=$(run_query "${TABLE_QUERY}")
        
        if [ -z "${TABLES}" ]; then
            echo "[TENANT-RECOVERY] [ERROR] No tenant-isolated tables found in database."
            exit 1
        fi
        
        # 2. Export each table to CSV
        for table in ${TABLES}; do
            echo "  - Exporting table: ${table}..."
            COPY_CMD="COPY (SELECT * FROM ai_support_agent.${table} WHERE tenant_id = '${TENANT_ID}') TO STDOUT WITH CSV HEADER;"
            
            if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
                docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "${COPY_CMD}" > "${OUTPUT_DIR}/${table}.csv"
            else
                psql -U "${DB_USER}" -d "${DB_NAME}" -h localhost -c "${COPY_CMD}" > "${OUTPUT_DIR}/${table}.csv"
            fi
        done
        
        # Archive and encrypt
        ARCHIVE_FILE="/tmp/tenant_${TENANT_ID}_${RAW_TIMESTAMP:-"export"}.tar.gz"
        tar -czf "${ARCHIVE_FILE}" -C "${OUTPUT_DIR}" .
        
        ENC_FILE="${OUTPUT_DIR}/tenant_${TENANT_ID}_export.tar.gz.enc"
        openssl enc -aes-256-cbc -salt -pbkdf2 -pass pass:"${BACKUP_PASSPHRASE}" -in "${ARCHIVE_FILE}" -out "${ENC_FILE}"
        
        rm -f "${ARCHIVE_FILE}"
        rm -rf "${OUTPUT_DIR}"/*.csv
        
        CHECKSUM=$(sha256sum "${ENC_FILE}" | cut -d' ' -f1)
        echo "[TENANT-RECOVERY] Export complete. Encrypted archive: ${ENC_FILE}. Checksum: ${CHECKSUM}"
        ;;

    import)
        IMPORT_FILE=${PATH_ARG:-}
        if [ -z "${IMPORT_FILE}" ] || [ ! -f "${IMPORT_FILE}" ]; then
            echo "[TENANT-RECOVERY] [ERROR] Import file path must be specified and must exist."
            exit 1
        fi
        
        echo "[TENANT-RECOVERY] Importing data from: ${IMPORT_FILE} for tenant: ${TENANT_ID}..."
        TEMP_DIR="/tmp/tenant_import_${TENANT_ID}"
        DEC_FILE="/tmp/tenant_dec_${TENANT_ID}.tar.gz"
        rm -rf "${TEMP_DIR}"
        mkdir -p "${TEMP_DIR}"
        
        # Decrypt
        if ! openssl enc -d -aes-256-cbc -salt -pbkdf2 -pass pass:"${BACKUP_PASSPHRASE}" -in "${IMPORT_FILE}" -out "${DEC_FILE}"; then
            echo "[TENANT-RECOVERY] [ERROR] Decryption failed."
            exit 1
        fi
        
        # Unpack
        tar -xzf "${DEC_FILE}" -C "${TEMP_DIR}"
        rm -f "${DEC_FILE}"
        
        # Import tables
        CSV_FILES=$(ls "${TEMP_DIR}"/*.csv)
        
        # Disable constraints dynamically during restore to prevent ordering errors
        run_query "SET session_replication_role = 'replica';"
        
        for csv_file in ${CSV_FILES}; do
            table_name=$(basename "${csv_file}" .csv)
            echo "  - Importing table: ${table_name}..."
            
            # Clear existing data for tenant in this table to prevent duplicates
            run_query "DELETE FROM ai_support_agent.${table_name} WHERE tenant_id = '${TENANT_ID}';"
            
            # COPY load
            if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
                docker cp "${csv_file}" "${DB_CONTAINER}:/tmp/${table_name}.csv"
                docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "\copy ai_support_agent.${table_name} FROM '/tmp/${table_name}.csv' WITH CSV HEADER;"
                docker exec -i "${DB_CONTAINER}" rm -f "/tmp/${table_name}.csv"
            else
                psql -U "${DB_USER}" -d "${DB_NAME}" -h localhost -c "\copy ai_support_agent.${table_name} FROM '${csv_file}' WITH CSV HEADER;"
            fi
        done
        
        # Re-enable constraints
        run_query "SET session_replication_role = 'origin';"
        rm -rf "${TEMP_DIR}"
        echo "[TENANT-RECOVERY] Import completed. Initiating integrity check..."
        $0 validate "${TENANT_ID}"
        ;;

    validate)
        echo "[TENANT-RECOVERY] Running consistency & integrity validation for tenant: ${TENANT_ID}..."
        
        # 1. Row Counts Checks
        CUST_COUNT=$(run_query "SELECT COUNT(*) FROM ai_support_agent.customers WHERE tenant_id = '${TENANT_ID}';")
        CONV_COUNT=$(run_query "SELECT COUNT(*) FROM ai_support_agent.conversations WHERE tenant_id = '${TENANT_ID}';")
        MSG_COUNT=$(run_query "SELECT COUNT(*) FROM ai_support_agent.messages WHERE tenant_id = '${TENANT_ID}';")
        TKT_COUNT=$(run_query "SELECT COUNT(*) FROM ai_support_agent.tickets WHERE tenant_id = '${TENANT_ID}';")
        
        echo "  - Customers: ${CUST_COUNT}"
        echo "  - Conversations: ${CONV_COUNT}"
        echo "  - Messages: ${MSG_COUNT}"
        echo "  - Tickets: ${TKT_COUNT}"
        
        # 2. Orphans Check
        # Messages that point to non-existent conversations
        ORPHAN_MSGS=$(run_query "SELECT COUNT(*) FROM ai_support_agent.messages m LEFT JOIN ai_support_agent.conversations c ON m.conversation_id = c.id WHERE m.tenant_id = '${TENANT_ID}' AND c.id IS NULL;")
        
        # Tickets that point to non-existent customers
        ORPHAN_TKTS=$(run_query "SELECT COUNT(*) FROM ai_support_agent.tickets t LEFT JOIN ai_support_agent.customers c ON t.customer_id = c.id WHERE t.tenant_id = '${TENANT_ID}' AND c.id IS NULL;")
        
        echo "  - Orphaned Messages: ${ORPHAN_MSGS}"
        echo "  - Orphaned Tickets: ${ORPHAN_TKTS}"
        
        if [ "${ORPHAN_MSGS}" -gt 0 ] || [ "${ORPHAN_TKTS}" -gt 0 ]; then
            echo "[TENANT-RECOVERY] [WARNING] Referential integrity issues detected!"
            exit 2
        else
            echo "[TENANT-RECOVERY] [OK] All referential integrity check validations passed successfully."
        fi
        ;;
        
    *)
        echo "[TENANT-RECOVERY] [ERROR] Unknown command: ${COMMAND}"
        exit 1
        ;;
esac
