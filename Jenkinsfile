// ──────────────────────────────────────────────────────────────
// Loopin Automation – Declarative Jenkins Pipeline
// ──────────────────────────────────────────────────────────────
//
// Architecture:
//   Windows Jenkins host → runs Linux Docker container for tests
//   Reports are volume-mounted back to the host for publishing
//
// Features:
//   • Docker-based test execution (Playwright + Edge)
//   • Parameterized builds (suite, browser, workers, retries)
//   • JUnit test trend tracking
//   • HTML report publishing (Playwright + custom dashboard)
//   • Email notifications on failure/recovery
//   • Scheduled nightly runs (weekdays 6 AM IST)
//   • Triggered on pushes and PRs to all branches
// ──────────────────────────────────────────────────────────────

pipeline {
    // Run on the Windows Jenkins node directly.
    // Docker is invoked manually in the test stage.
    agent any

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
            defaultValue: false,
            description: 'Force a brand-new login (ignore cached auth state). Edge profile is preserved.'
        )
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
        // Stage 1: Prepare output directories on Windows host
        // ────────────────────────────────────────────────────
        stage('Prepare Workspace') {
            steps {
                echo '📁 Creating output directories...'
                bat 'if not exist "test-results" mkdir "test-results"'
                bat 'if not exist "playwright-report" mkdir "playwright-report"'
                bat 'if not exist "custom-report" mkdir "custom-report"'
            }
        }

        // ────────────────────────────────────────────────────
        // Stage 2: Run tests inside Docker
        // ────────────────────────────────────────────────────
        stage('Run Tests in Docker') {
            steps {
                // Inject secrets from Jenkins credentials store
                withCredentials([
                    string(credentialsId: 'LOOPIN_USERNAME',           variable: 'LOOPIN_USERNAME'),
                    string(credentialsId: 'LOOPIN_PASSWORD_ENCRYPTED', variable: 'LOOPIN_PASSWORD_ENCRYPTED'),
                    string(credentialsId: 'LOOPIN_PASSWORD_KEY',       variable: 'LOOPIN_PASSWORD_KEY'),
                    string(credentialsId: 'LOOPIN_TOTP_SECRET',        variable: 'LOOPIN_TOTP_SECRET')
                ]) {
                    script {
                        def testCmd = getTestCommand(params.TEST_SUITE)
                        // Convert Windows backslashes to forward slashes for Docker volume mounts
                        def wsPath = env.WORKSPACE.replace('\\', '/')

                        echo "🧪 Running: ${testCmd}"
                        echo "📂 Workspace: ${wsPath}"

                        // Run tests in a Linux Docker container.
                        // Volume-mount report directories so results are
                        // accessible on the Windows host after the container exits.
                        // Credentials are passed via -e flags (Jenkins masks them in logs).
                        def exitCode = bat(
                            script: """@echo off
docker run --rm --ipc=host ^
  -e CI=true ^
  -e LOOPIN_BASE_URL=${params.BASE_URL} ^
  -e LOOPIN_USERNAME=%LOOPIN_USERNAME% ^
  -e LOOPIN_PASSWORD_ENCRYPTED=%LOOPIN_PASSWORD_ENCRYPTED% ^
  -e LOOPIN_PASSWORD_KEY=%LOOPIN_PASSWORD_KEY% ^
  -e LOOPIN_TOTP_SECRET=%LOOPIN_TOTP_SECRET% ^
  -e LOOPIN_WORKERS=${params.WORKERS} ^
  -e LOOPIN_RETRIES=${params.RETRIES} ^
  -e LOOPIN_TIMEOUT=120000 ^
  -e LOOPIN_FORCE_FRESH_LOGIN=${params.FORCE_FRESH_LOGIN} ^
  -v "${wsPath}/test-results:/app/test-results" ^
  -v "${wsPath}/playwright-report:/app/playwright-report" ^
  -v "${wsPath}/custom-report:/app/custom-report" ^
  loopin-playwright:latest ^
  ${testCmd}
""",
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
                allowEmptyResults: true
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

            // ── Cleanup report directories ──────────────────
            bat '''
                if exist "test-results" rmdir /s /q "test-results"
                if exist "playwright-report" rmdir /s /q "playwright-report"
                if exist "custom-report" rmdir /s /q "custom-report"
            '''
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
