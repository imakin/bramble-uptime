// @ts-check
const { test, expect } = require('@playwright/test');

// Endpoint yang MEMANG menjawab 401 untuk pengunjung anonim.
// Diverifikasi langsung ke situs 2026-09-07: ini normal, bukan downtime.
// Kalau daftar ini berubah, verifikasi ulang sebelum menambah/mengurangi.
const NORMAL_401 = [
    'QueryBlogs.json',
    'QueryBrowseHistory.json',
    'QueryProductParts.json',
    'QueryCustomerAlsoBought.json',
];

/** Kumpulkan hanya kegagalan yang benar-benar milik Bramble. */
function pantauJaringan(page) {
    const gagal = [];
    page.on('response', (r) => {
        const url = r.url();
        if (!url.includes('brambleco.com')) return;    // pihak ketiga (yotpo dll) bukan urusan kita
        if (r.status() < 400) return;
        if (r.status() === 401 && NORMAL_401.some((e) => url.includes(e))) return;
        gagal.push(`${r.status()} ${url}`);
    });
    page.on('pageerror', (e) => gagal.push(`JS ERROR: ${e.message}`));
    return gagal;
}

async function lampirkan(testInfo, nama, isi) {
    await testInfo.attach(nama, { body: String(isi), contentType: 'text/plain' });
}

test('PDP quick ship 27622FRWSF267----: data Emun rendered', async ({ page }, testInfo) => {
    await lampirkan(testInfo, 'tries-n:', testInfo.retry);
    const gagal = pantauJaringan(page);

    const mulai = Date.now();
    const response = await page.goto('/shop/27622FRWSF267----');
    if (!response) throw new Error('no HTTP response at all');
    expect(response.status()).toBe(200);

    // Nama produk datang dari database Emun. Shell bisa terkirim tanpa ini.
    await expect(page.locator('h1')).toHaveText(
        'Cholet Arm Chair in Fruitwood w/ Chestnut Brown Chenille Performance Fabric'
    );

    await lampirkan(testInfo, 'duration-load-ms', Date.now() - mulai);
    if (gagal.length) await lampirkan(testInfo, 'request-failed', gagal.join('\n'));
});

test('PDP custom 28055: Customize open configurator', async ({ page }, testInfo) => {
    await lampirkan(testInfo, 'tries-n:', testInfo.retry);
    const gagal = pantauJaringan(page);

    // Rekam status tiap endpoint /service/ yang dipanggil, kunci = nama file.
    const layanan = new Map();
    page.on('response', (r) => {
        const url = r.url();
        if (url.includes('/service/')) {
            layanan.set(url.split('?')[0].split('/').pop(), r.status());
        }
    });

    const mulai = Date.now();
    const response = await page.goto('/shop/28055');
    if (!response) throw new Error('no HTTP response at all');
    expect(response.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('Vannes Display Cabinet');
    await lampirkan(testInfo, 'duration-load-ms', Date.now() - mulai);

    // exact:true, tanpanya ikut tertangkap tautan "How To Customize".
    const tombol = page.getByRole('button', { name: 'Customize', exact: true });
    await expect(tombol).toHaveCount(1);

    let mulaiKlik = Date.now();
    await tombol.click();

    // Modal, bukan halaman: URL tidak berubah, jadi jangan cek URL.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Main Body').first()).toBeVisible();
    await lampirkan(testInfo, 'duration-open-configurator-ms', Date.now() - mulaiKlik);

    // buka Main Body finish
    const mainbody = page.getByText('Main Body', { exact: true });
    mulaiKlik = Date.now();
    await mainbody.click();
    // Pastikan setidaknya elemen pertama sudah muncul di DOM
    await page.locator('a.configurator-value-image-container').first().waitFor({ state: 'attached' });
    const mainbody_options_count = await page.locator('a.grid-item').count();
    expect(mainbody_options_count).toBeGreaterThan(40);
    await lampirkan(testInfo, 'duration-open-configurator-mainbody-ms', Date.now() - mulaiKlik);



    // Bukti tingkat jaringan: keempat endpoint konfigurator benar-benar menjawab 200.
    // Tidak satu pun dari ini dipantau HetrixTools/UptimeRobot.
    for (const endpoint of [
        'QueryOptionFields.json',
        'QueryOptionLists.json',
        'QueryOptionPrebuilts.json',
        'GetCustomOptionFieldValues.json',
    ]) {
        await expect
            .poll(() => layanan.get(endpoint), { message: `${endpoint} tidak menjawab 200` })
            .toBe(200);
    }

    if (gagal.length) await lampirkan(testInfo, 'request-failed', gagal.join('\n'));
});
