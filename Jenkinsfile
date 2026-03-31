// ──────────────────────────────────────────────────────────────
// Loopin Automation – Declarative Jenkins Pipeline
// ──────────────────────────────────────────────────────────────
//
// Features:
//   • Docker agent (Playwright + Edge)
//   • Parameterized builds (suite, browser, workers, retries)
//   • JUnit test trend tracking
//   • HTML report publishing (Playwright + custom dashboard)
//   • Email notifications on failure/recovery
//   • Scheduled nightly runs (weekdays 6 AM IST)
//   • Triggered on pushes and PRs to all branches
// ──────────────────────────────────────────────────────────────

pipeline {
    agent {
        docker {
            image 'loopin-playwright:latest'
            // If you push the image to a registry, replace with:
            // image 'your-registry.com/loopin-playwright:latest'
            args '--ipc=host'  // Required for Chromium sandboxing
        }
    }

    // ── Triggers ────────────────────────────────────────────
    triggers {
        // Weekdays at approximately 6:00 AM IST (00:30 UTC)
        cron('30 0 * * 1-5')
    }

    // ── Build Parameters ────────────────────────────────────
    parameters {
        choice(
            name: 'TEST_SUITE',
            choices: ['all', 'login', 'dashboard', 'requisition', 'referrals'],
            description: 'Which test suite to run'
        )
        choice(
            name: 'BROWSER',
            choices: ['msedge', 'chromium'],
            description: 'Browser to run tests in'
        )
        string(
            name: 'WORKERS',
            defaultValue: '2',
            description: 'Number of parallel Playwright workers'
        )
        string(
            name: 'RETRIES',
            defaultValue: '2',
            description: 'Number of retries for failed tests'
        )
        string(
            name: 'BASE_URL',
            defaultValue: 'https://vhiredev.z22.web.core.windows.net',
            description: 'Application base URL to test against'
        )
        booleanParam(
            name: 'FORCE_FRESH_LOGIN',
            defaultValue: true,
            description: 'Force a brand-new login (ignore cached auth state)'
        )
    }

    // ── Environment ─────────────────────────────────────────
    environment {
        CI                      = 'true'
        LOOPIN_BASE_URL         = "${params.BASE_URL}"
        LOOPIN_WORKERS          = "${params.WORKERS}"
        LOOPIN_RETRIES          = "${params.RETRIES}"
        LOOPIN_TIMEOUT          = '120000'
        LOOPIN_FORCE_FRESH_LOGIN = "${params.FORCE_FRESH_LOGIN}"
    }

    // ── Options ─────────────────────────────────────────────
    options {
        timeout(time: 60, unit: 'MINUTES')
        timestamps()
        ansiColor('xterm')
        buildDiscarder(logRotator(
            numToKeepStr: '30',
            artifactNumToKeepStr: '10'
        ))
        disableConcurrentBuilds()
    }

    stages {
        // ────────────────────────────────────────────────────
        // Stage 1: Install dependencies
        // ────────────────────────────────────────────────────
        stage('Install Dependencies') {
            steps {
                echo '📦 Installing Node.js dependencies...'
                sh 'npm ci'
            }
        }

        // ────────────────────────────────────────────────────
        // Stage 2: Install browsers
        // ────────────────────────────────────────────────────
        stage('Install Browsers') {
            steps {
                echo '🌐 Installing Playwright browsers...'
                sh 'npx playwright install --with-deps chromium'
            }
        }

        // ────────────────────────────────────────────────────
        // Stage 3: Run tests
        // ────────────────────────────────────────────────────
        stage('Run Tests') {
            steps {
                // Inject secrets from Jenkins credentials store
                withCredentials([
                    string(credentialsId: 'LOOPIN_USERNAME',           variable: 'LOOPIN_USERNAME'),
                    string(credentialsId: 'LOOPIN_PASSWORD',           variable: 'LOOPIN_PASSWORD'),
                    string(credentialsId: 'LOOPIN_PASSWORD_ENCRYPTED', variable: 'LOOPIN_PASSWORD_ENCRYPTED'),
                    string(credentialsId: 'LOOPIN_PASSWORD_KEY',       variable: 'LOOPIN_PASSWORD_KEY'),
                    string(credentialsId: 'LOOPIN_TOTP_SECRET',        variable: 'LOOPIN_TOTP_SECRET')
                ]) {
                    script {
                        def testCommand = getTestCommand(params.TEST_SUITE)
                        echo "🧪 Running: ${testCommand}"
                        // Use returnStatus so the pipeline continues to
                        // publish reports even when tests fail
                        def exitCode = sh(
                            script: testCommand,
                            returnStatus: true
                        )
                        if (exitCode != 0) {
                            echo "⚠️  Tests exited with code ${exitCode}"
                            currentBuild.result = 'UNSTABLE'
                        }
                    }
                }
            }
        }
    }

    // ── Post-build actions ──────────────────────────────────
    post {
        always {
            echo '📊 Publishing test reports...'

            // ── JUnit results (test trend graph) ────────────
            junit(
                testResults: 'test-results/junit-results.xml',
                allowEmptyResults: true,
                skipPublishingChecks: true
            )

            // ── Playwright HTML Report ──────────────────────
            publishHTML(target: [
                reportName:  'Playwright Report',
                reportDir:   'playwright-report',
                reportFiles: 'index.html',
                keepAll:     true,
                alwaysLinkToLastBuild: true,
                allowMissing: true
            ])

            // ── Custom Dashboard Report ─────────────────────
            publishHTML(target: [
                reportName:  'Custom Dashboard',
                reportDir:   'custom-report',
                reportFiles: 'index.html',
                keepAll:     true,
                alwaysLinkToLastBuild: true,
                allowMissing: true
            ])

            // ── Archive artifacts ───────────────────────────
            archiveArtifacts(
                artifacts: 'test-results/**/*,playwright-report/**/*,custom-report/**/*',
                allowEmptyArchive: true,
                fingerprint: true
            )

            // ── Cleanup workspace ───────────────────────────
            cleanWs(
                cleanWhenNotBuilt: false,
                deleteDirs: true,
                patterns: [
                    [pattern: 'test-results/**', type: 'INCLUDE'],
                    [pattern: 'playwright-report/**', type: 'INCLUDE'],
                    [pattern: 'custom-report/**', type: 'INCLUDE'],
                    [pattern: '.auth/**', type: 'INCLUDE'],
                    [pattern: '.edge-profile/**', type: 'INCLUDE'],
                    [pattern: 'node_modules/**', type: 'EXCLUDE']
                ]
            )
        }

        failure {
            echo '❌ Build FAILED – sending notification...'
            emailext(
                subject: "❌ FAILED: Loopin Automation – ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
                    <h2>❌ Build Failed</h2>
                    <p><b>Job:</b> ${env.JOB_NAME}</p>
                    <p><b>Build:</b> #${env.BUILD_NUMBER}</p>
                    <p><b>Suite:</b> ${params.TEST_SUITE}</p>
                    <p><b>Browser:</b> ${params.BROWSER}</p>
                    <p><b>Duration:</b> ${currentBuild.durationString}</p>
                    <p><b>Console:</b> <a href="${env.BUILD_URL}console">View Logs</a></p>
                    <p><b>Report:</b> <a href="${env.BUILD_URL}Playwright_20Report/">Playwright Report</a></p>
                    <p><b>Dashboard:</b> <a href="${env.BUILD_URL}Custom_20Dashboard/">Custom Dashboard</a></p>
                """,
                mimeType: 'text/html',
                recipientProviders: [
                    [$class: 'CulpritsRecipientProvider'],
                    [$class: 'RequesterRecipientProvider']
                ]
            )
        }

        unstable {
            echo '⚠️  Build UNSTABLE (some tests failed) – sending notification...'
            emailext(
                subject: "⚠️ UNSTABLE: Loopin Automation – ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
                    <h2>⚠️ Some Tests Failed</h2>
                    <p><b>Job:</b> ${env.JOB_NAME}</p>
                    <p><b>Build:</b> #${env.BUILD_NUMBER}</p>
                    <p><b>Suite:</b> ${params.TEST_SUITE}</p>
                    <p><b>Browser:</b> ${params.BROWSER}</p>
                    <p><b>Duration:</b> ${currentBuild.durationString}</p>
                    <p><b>Console:</b> <a href="${env.BUILD_URL}console">View Logs</a></p>
                    <p><b>Report:</b> <a href="${env.BUILD_URL}Playwright_20Report/">Playwright Report</a></p>
                    <p><b>Dashboard:</b> <a href="${env.BUILD_URL}Custom_20Dashboard/">Custom Dashboard</a></p>
                """,
                mimeType: 'text/html',
                recipientProviders: [
                    [$class: 'CulpritsRecipientProvider'],
                    [$class: 'RequesterRecipientProvider']
                ]
            )
        }

        fixed {
            echo '✅ Build RECOVERED – sending notification...'
            emailext(
                subject: "✅ RECOVERED: Loopin Automation – ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
                    <h2>✅ Tests Are Passing Again</h2>
                    <p><b>Job:</b> ${env.JOB_NAME}</p>
                    <p><b>Build:</b> #${env.BUILD_NUMBER}</p>
                    <p><b>Duration:</b> ${currentBuild.durationString}</p>
                    <p><b>Report:</b> <a href="${env.BUILD_URL}Playwright_20Report/">Playwright Report</a></p>
                """,
                mimeType: 'text/html',
                recipientProviders: [
                    [$class: 'CulpritsRecipientProvider'],
                    [$class: 'RequesterRecipientProvider']
                ]
            )
        }
    }
}

// ── Helper: map suite parameter to test command ─────────────
def getTestCommand(String suite) {
    switch (suite) {
        case 'login':
            return 'npx playwright test tests/01-login.spec.ts --reporter=list,html,junit,./src/reporters/custom-dashboard.reporter.ts'
        case 'dashboard':
            return 'npx playwright test tests/02-employee-dashboard.spec.ts --reporter=list,html,junit,./src/reporters/custom-dashboard.reporter.ts'
        case 'requisition':
            return 'npx playwright test tests/03-requisition.spec.ts --reporter=list,html,junit,./src/reporters/custom-dashboard.reporter.ts'
        case 'referrals':
            return 'npx playwright test tests/04-referrals.spec.ts --reporter=list,html,junit,./src/reporters/custom-dashboard.reporter.ts'
        default:
            return 'npm run test:ci'
    }
}
