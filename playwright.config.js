
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    outputDir: './test-results',

    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 2,
    
    timeout: 60_000,
    globalTimeout: 5 * 60_000,
    expect: {
        timeout: 15_000
    },

    reporter: [
        ['list'],
        ['html', { open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }]
    ],

    use: {
        baseURL: 'https://brambleco.com',

        // nagivation timeout 30 detik saama seperti uptimerobot
        navigationTimeout: 30_000,
        actionTimeout: 15_000,

        // check https
        ignoreHTTPSErrors: false,

        // pelanggan US
        locale: 'en-US',
        timezoneId: 'America/New_York',

        screenshot: 'on',
        trace: 'on',
        video: 'off',
    },

    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
});