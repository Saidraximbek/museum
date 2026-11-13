import { TextureGenerator } from '../museum/TextureGenerator.js';

const DB_NAME = 'RomanticMuseumDB';
const DB_VERSION = 2;
const STORE_NAME = 'artworks';

export class GalleryStorage {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('slotIndex', 'slotIndex', { unique: false });
        }
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;

        // 1. Check if public/gallery-data.json is provided by the owner
        const hasBundledData = await this.tryLoadBundledData();

        // 2. If no bundled data and DB is empty, seed defaults
        if (!hasBundledData) {
          const count = await this.getCount();
          if (count === 0) {
            await this.seedRomanticArtworks();
          }
        }

        resolve(this);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Automatically fetches public/gallery-data.json so that ANY device
   * (e.g. Zulfiya's phone) sees the owner's uploaded photos instantly!
   */
  async tryLoadBundledData() {
    try {
      const res = await fetch('/gallery-data.json', { cache: 'no-store' });
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          // Check if local DB is empty or has fewer user photos
          const localItems = await this.getAll();
          const localUserUploads = localItems.filter(i => i.isUserUploaded).length;
          const bundledUserUploads = items.filter(i => i.isUserUploaded).length;

          // If bundled data has user photos, sync them
          if (bundledUserUploads > localUserUploads || localItems.length === 0) {
            for (const item of items) {
              await this.save(item, false); // save without re-triggering API
            }
            return true;
          }
        }
      }
    } catch (e) {
      // Ignore if file doesn't exist yet
    }
    return false;
  }

  async getCount() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const countReq = store.count();
      countReq.onsuccess = () => resolve(countReq.result);
      countReq.onerror = () => reject(countReq.error);
    });
  }

  async getAll() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const res = request.result || [];
        res.sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));
        resolve(res);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async save(artwork, syncToDisk = true) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(artwork);

      request.onsuccess = () => {
        if (syncToDisk) {
          this.syncAllToDisk().catch(() => {});
        }
        resolve(artwork);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => {
        this.syncAllToDisk().catch(() => {});
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Syncs the entire gallery to public/gallery-data.json on the server/disk
   * so it gets committed and deployed to other devices automatically!
   */
  async syncAllToDisk() {
    const all = await this.getAll();

    try {
      const response = await fetch('/api/save-gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(all)
      });

      if (!response.ok) {
        throw new Error(`Gallery sync endpoint returned ${response.status}`);
      }

      return true;
    } catch (e) {
      // Static hosting (e.g. Vercel) cannot write to the repo filesystem from the browser.
      // Offer a file download so the user can commit public/gallery-data.json and redeploy.
      const jsonBlob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(jsonBlob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = 'gallery-data.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);

      throw new Error('Static hosting cannot persist gallery data automatically. The gallery JSON was downloaded to your device. Save it as public/gallery-data.json and redeploy the project so other devices can see the photos.');
    }
  }

  async seedRomanticArtworks() {
    const romanticPresets = [
      {
        slotIndex: 0,
        title: 'Birinchi Uchrashuvimiz 💕',
        artist: 'Bizning Sevgi Qissamiz',
        year: '2024',
        description: 'Ko‘zlaringga ilk bor boqqan va vaqt to‘xtab qolgandek tuyulgan o‘sha sehrli kun.',
        frameStyle: 'classic-gold',
        type: 'samarkand'
      },
      {
        slotIndex: 1,
        title: 'Yulduzlar Ostidagi Sayr 🌙',
        artist: 'Senga bag‘ishlangan',
        year: '2024',
        description: 'Tungi sokinlikda qo‘llaringni ushlab orzu qilgan lahzalarimiz.',
        frameStyle: 'neon-glow',
        type: 'starry'
      },
      {
        slotIndex: 2,
        title: 'Sening Mayin Tabassuming 🌹',
        artist: 'Cheksiz Muhabbat',
        year: '2025',
        description: 'Dunyodagi eng go‘zal va samimiy tabassum. Sening quvonching — mening eng katta baxtimdir.',
        frameStyle: 'classic-gold',
        type: 'portrait'
      },
      {
        slotIndex: 3,
        title: 'Oltin Kuz va Bizning Xotiralar 🍂',
        artist: 'Baxtli Kunlar',
        year: '2025',
        description: 'Xiyobon bo‘ylab birga qadam tashlagan iliq muhabbat fasli.',
        frameStyle: 'vintage-wood',
        type: 'autumn'
      },
      {
        slotIndex: 4,
        title: 'Tog‘lar Qadar Mustahkam Sevgi 🏔️',
        artist: 'Yurakdan',
        year: '2025',
        description: 'Sen bilan har qanday qiyinchilik oson va go‘zal.',
        frameStyle: 'modern-black',
        type: 'mountains'
      },
      {
        slotIndex: 5,
        title: 'Bizning Shirin Orzularimiz ✨',
        artist: 'Biz Ikkovimiz',
        year: '2026',
        description: 'Kelajak sari birga intilayotgan nurli yo‘limiz.',
        frameStyle: 'classic-gold',
        type: 'abstract'
      }
    ];

    for (let i = 0; i < 22; i++) {
      const preset = romanticPresets.find(p => p.slotIndex === i);
      let art;
      if (preset) {
        art = {
          id: `art-romantic-${i}`,
          slotIndex: i,
          title: preset.title,
          artist: preset.artist,
          year: preset.year,
          description: preset.description,
          frameStyle: preset.frameStyle,
          imageUrl: TextureGenerator.generateArtCanvas(preset.type, preset.title),
          isUserUploaded: false,
          isPlaceholder: false,
          createdAt: Date.now() + i
        };
      } else {
        art = {
          id: `art-slot-${i}`,
          slotIndex: i,
          title: `Xotiramiz Surati #${i + 1} 💖`,
          artist: 'Sevganingizga sovg‘a',
          year: '2026',
          description: 'Ushbu ramkaga sevimli insoningiz bilan tushgan fotosuratingizni joylang!',
          frameStyle: (i % 4 === 0) ? 'classic-gold' : (i % 4 === 1 ? 'neon-glow' : (i % 4 === 2 ? 'vintage-wood' : 'modern-black')),
          imageUrl: TextureGenerator.generateArtCanvas('empty', 'Rasm Joylang'),
          isUserUploaded: false,
          isPlaceholder: true,
          createdAt: Date.now() + i
        };
      }
      await this.save(art, false);
    }

    // Save initial bundled data
    await this.syncAllToDisk().catch(() => {});
  }

  async exportGalleryJSON() {
    const all = await this.getAll();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(all, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `gallery-data.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  async importGalleryJSON(jsonString) {
    try {
      const items = JSON.parse(jsonString);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item && item.id) {
            await this.save(item, false);
          }
        }
        await this.syncAllToDisk().catch(() => {});
        return true;
      }
    } catch (e) {
      console.error('Import failed', e);
      throw e;
    }
    return false;
  }
}
