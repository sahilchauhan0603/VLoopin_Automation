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
        // Weekdays at approximately 11:00 AM IST (05:30 UTC)
        cron('30 5 * * 1-5')
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
  -v "C:/THIS_DEVICE/Loopin/Automation/.edge-profile:/app/.edge-profile" ^
  -v "C:/THIS_DEVICE/Loopin/Automation/.auth:/app/.auth" ^
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
            sendProfessionalEmail(env, params, currentBuild, 'FAILED', '#d73a4a', '❌')
        }

        unstable {
            echo '⚠️  Build UNSTABLE (some tests failed) – sending notification...'
            // Use orange/yellow for unstable
            sendProfessionalEmail(env, params, currentBuild, 'UNSTABLE', '#d08700', '⚠️')
        }

        fixed {
            echo '✅ Build RECOVERED – sending notification...'
            sendProfessionalEmail(env, params, currentBuild, 'RECOVERED', '#28a745', '✅')
        }
        
        success {
            // Also send a nice clean email on absolute success
            echo '✅ Build SUCCESS – sending notification...'
            sendProfessionalEmail(env, params, currentBuild, 'SUCCESS', '#28a745', '✅')
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

// ── Helper: send a professional HTML email notification ─────────
def sendProfessionalEmail(env, params, currentBuild, String buildStatus, String headerColor, String emoji) {
    def subjectLine = "${emoji} [${buildStatus}] Loopin Automation – ${env.JOB_NAME} #${env.BUILD_NUMBER}"
    
    // Using inline CSS as it has the best compatibility with web/desktop email clients
    def emailBody = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #24292e; line-height: 1.5; margin: 0; padding: 0; background-color: #f6f8fa; }
            .container { max-width: 650px; margin: 30px auto; background-color: #ffffff; border-radius: 6px; box-shadow: 0 3px 6px rgba(149,157,165,0.15); border: 1px solid #e1e4e8; overflow: hidden; }
            .header { background-color: ${headerColor}; color: #ffffff; padding: 24px; text-align: left; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 500; letter-spacing: 0.5px; }
            .content { padding: 32px; }
            .intro { font-size: 16px; margin-top: 0; margin-bottom: 24px; color: #586069; }
            .intro b { color: #24292e; }
            
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 4px; overflow: hidden; border: 1px solid #eaecef; }
            .info-table tr:nth-child(even) { background-color: #f8f9fa; }
            .info-table th, .info-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #eaecef; font-size: 14px; }
            .info-table th { width: 30%; color: #586069; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; }
            .info-table td { font-weight: 500; color: #24292e; }
            
            .actions { text-align: center; margin-top: 24px; }
            .actions a { display: inline-block; text-decoration: none; font-weight: 600; font-size: 14px; padding: 10px 20px; border-radius: 6px; margin: 0 8px 12px 8px; transition: background-color 0.2s; }
            .btn-primary { background-color: #0366d6; color: #ffffff !important; border: 1px solid #0366d6; }
            .btn-secondary { background-color: #ffffff; color: #0366d6 !important; border: 1px solid #0366d6; }
            
            .footer { background-color: #fafbfc; padding: 16px; text-align: center; font-size: 12px; color: #6a737d; border-top: 1px solid #e1e4e8; }
            .footer a { color: #0366d6; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${emoji} Build ${buildStatus}</h1>
            </div>
            <div class="content">
                <p class="intro">
                    Pipeline execution for <b>${env.JOB_NAME}</b> has completed with a status of <b>${buildStatus}</b>.
                </p>
                
                <table class="info-table">
                    <tr>
                        <th>Build Number</th>
                        <td>#${env.BUILD_NUMBER}</td>
                    </tr>
                    <tr>
                        <th>Test Suite</th>
                        <td>${params.TEST_SUITE != null ? params.TEST_SUITE : 'Not specified'}</td>
                    </tr>
                    <tr>
                        <th>Browser</th>
                        <td>${params.BROWSER != null ? params.BROWSER : 'Not specified'}</td>
                    </tr>
                    <tr>
                        <th>Execution Time</th>
                        <td>${currentBuild.durationString.replaceAll(' and counting', '')}</td>
                    </tr>
                </table>

                <div class="actions">
                    <a href="${env.BUILD_URL}console" class="actions a btn-secondary">Terminal Logs</a>
                    <a href="${env.BUILD_URL}Playwright_20Report/" class="actions a btn-primary">Playwright Report</a>
                    <a href="${env.BUILD_URL}Custom_20Dashboard/" class="actions a btn-primary">Custom Dashboard</a>
                </div>
            </div>
            <div class="footer">
                Automated notification from <strong>Jenkins CI/CD Pipeline</strong><br>
                Please verify the logs if the build was unstable or failed.
            </div>
        </div>
    </body>
    </html>
    """
    
    emailext(
        subject: subjectLine,
        body: emailBody,
        mimeType: 'text/html',
        recipientProviders: [
            [$class: 'CulpritsRecipientProvider'],
            [$class: 'RequesterRecipientProvider']
        ]
    )
}
