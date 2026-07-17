pipeline {
    agent any

    options {
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '10'))
        timestamps()
        ansiColor('xterm')
    }

    environment {
        REGISTRY = 'ghcr.io'
        DOCKER_BUILDKIT = '1'
        NPM_CONFIG_CACHE = "${WORKSPACE}/.npm-cache"
        PNPM_HOME = "${WORKSPACE}/.pnpm-store"
    }

    stages {
        stage('Initialize') {
            steps {
                script {
                    env.GIT_SHA = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    env.BRANCH_NAME = env.BRANCH_NAME ?: sh(script: "git rev-parse --abbrev-ref HEAD", returnStdout: true).trim()
                    
                    def gitUrl = sh(script: "git config --get remote.origin.url", returnStdout: true).trim()
                    env.GITHUB_ORG = sh(script: "echo '${gitUrl}' | sed -E 's/.*github.com[:\\/]([^\\/]+)\\/.*/\\1/'", returnStdout: true).trim().toLowerCase()
                    
                    // Root repo name for GHCR specification
                    env.REPO_NAME = 'easydev-support-ai'
                    env.IMAGE_VERSION = sh(script: "node -p \"require('./package.json').version\" 2>/dev/null || echo ''", returnStdout: true).trim()
                    env.IMAGE_PATH_PREFIX = "${env.GITHUB_ORG}/${env.REPO_NAME}"
                    
                    echo "Starting Build for ${env.REPO_NAME} components on branch ${env.BRANCH_NAME} (Commit: ${env.GIT_SHA})"
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'pnpm install --frozen-lockfile --prefer-offline --config.dangerously-allow-all-scripts=true'
            }
        }

        stage('Build Packages') {
            steps {
                sh 'pnpm run build:packages'
            }
        }

        stage('Lint') {
            steps {
                sh 'pnpm run lint'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'pnpm run test --passWithNoTests'
            }
        }

        stage('Build Application') {
            steps {
                sh 'pnpm run build'
            }
        }

        stage('docker build --platform linux/arm64s (Parallel)') {
            parallel {
                stage('Build API Image') {
                    steps {
                        script {
                            def tagLatest = "${REGISTRY}/${env.IMAGE_PATH_PREFIX}-api:latest"
                            def tagSha = "${REGISTRY}/${env.IMAGE_PATH_PREFIX}-api:${env.GIT_SHA}"
                            def tagVersion = env.IMAGE_VERSION ? "-t ${REGISTRY}/${env.IMAGE_PATH_PREFIX}-api:${env.IMAGE_VERSION}" : ""
                            
                            sh "docker build --platform linux/arm64 --build-arg BUILDKIT_INLINE_CACHE=1 \
                                -t ${tagLatest} \
                                -t ${tagSha} \
                                ${tagVersion} \
                                --cache-from ${tagLatest} \
                                -f Dockerfile.api ."
                        }
                    }
                }
                stage('Build Worker Image') {
                    steps {
                        script {
                            def tagLatest = "${REGISTRY}/${env.IMAGE_PATH_PREFIX}-worker:latest"
                            def tagSha = "${REGISTRY}/${env.IMAGE_PATH_PREFIX}-worker:${env.GIT_SHA}"
                            def tagVersion = env.IMAGE_VERSION ? "-t ${REGISTRY}/${env.IMAGE_PATH_PREFIX}-worker:${env.IMAGE_VERSION}" : ""
                            
                            sh "docker build --platform linux/arm64 --build-arg BUILDKIT_INLINE_CACHE=1 \
                                -t ${tagLatest} \
                                -t ${tagSha} \
                                ${tagVersion} \
                                --cache-from ${tagLatest} \
                                -f Dockerfile.worker ."
                        }
                    }
                }
                stage('Build Webhook Image') {
                    steps {
                        script {
                            def tagLatest = "${REGISTRY}/${env.IMAGE_PATH_PREFIX}-webhook:latest"
                            def tagSha = "${REGISTRY}/${env.IMAGE_PATH_PREFIX}-webhook:${env.GIT_SHA}"
                            def tagVersion = env.IMAGE_VERSION ? "-t ${REGISTRY}/${env.IMAGE_PATH_PREFIX}-webhook:${env.IMAGE_VERSION}" : ""
                            
                            sh "docker build --platform linux/arm64 --build-arg BUILDKIT_INLINE_CACHE=1 \
                                -t ${tagLatest} \
                                -t ${tagSha} \
                                ${tagVersion} \
                                --cache-from ${tagLatest} \
                                -f Dockerfile.webhook ."
                        }
                    }
                }
            }
        }

        stage('Docker Push to GHCR') {
            when {
                expression {
                    return env.BRANCH_NAME == 'main' || env.BRANCH_NAME == 'master' || env.BRANCH_NAME.startsWith('release/')
                }
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'ghcr-credentials', usernameVariable: 'GHCR_USER', passwordVariable: 'GHCR_TOKEN')]) {
                    sh 'echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin'
                    
                    // Push API Image
                    sh "docker push ${REGISTRY}/${env.IMAGE_PATH_PREFIX}-api:latest"
                    sh "docker push ${REGISTRY}/${env.IMAGE_PATH_PREFIX}-api:${env.GIT_SHA}"
                    
                    // Push Worker Image
                    sh "docker push ${REGISTRY}/${env.IMAGE_PATH_PREFIX}-worker:latest"
                    sh "docker push ${REGISTRY}/${env.IMAGE_PATH_PREFIX}-worker:${env.GIT_SHA}"
                    
                    // Push Webhook Image
                    sh "docker push ${REGISTRY}/${env.IMAGE_PATH_PREFIX}-webhook:latest"
                    sh "docker push ${REGISTRY}/${env.IMAGE_PATH_PREFIX}-webhook:${env.GIT_SHA}"
                    
                    script {
                        if (env.IMAGE_VERSION) {
                            sh "docker push ${REGISTRY}/${env.IMAGE_PATH_PREFIX}-api:${env.IMAGE_VERSION}"
                            sh "docker push ${REGISTRY}/${env.IMAGE_PATH_PREFIX}-worker:${env.IMAGE_VERSION}"
                            sh "docker push ${REGISTRY}/${env.IMAGE_PATH_PREFIX}-webhook:${env.IMAGE_VERSION}"
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo "Cleaning up local images..."
                sh "docker rmi ${REGISTRY}/${env.IMAGE_PATH_PREFIX}-api:${env.GIT_SHA} || true"
                sh "docker rmi ${REGISTRY}/${env.IMAGE_PATH_PREFIX}-worker:${env.GIT_SHA} || true"
                sh "docker rmi ${REGISTRY}/${env.IMAGE_PATH_PREFIX}-webhook:${env.GIT_SHA} || true"
                cleanWs(deleteDirs: true, disableDeferredWipeout: true)
            }
        }
    }
}

