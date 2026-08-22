export const buildSummaryPrompt = (dateStr, conversationText) => {
  return `You are an expert AI executive assistant and conversation analyst. Your task is to analyze ALL WhatsApp conversation logs for date ${dateStr} without skipping ANY discussions, contacts, or media messages.

Date of Conversation: ${dateStr}

Raw Conversation Logs:
"""
${conversationText}
"""

CRITICAL INSTRUCTIONS:
1. COMPREHENSIVE COVERAGE: Include EVERYTHING from the conversation logs. Do NOT skip or truncate any contact, group, or discussion thread. Cover business/work, technical matters, family, social chats, and media messages (photos, voice notes, audio, files).
2. CONSISTENT STRUCTURE: You MUST format the "markdown" report with the exact structure below:

# 📅 Ringkasan Harian WhatsApp — ${dateStr}

## 📝 Deskripsi Hari Ini
[Tuliskan narasi komprehensif, mendalam, dan mendetail tentang segala hal yang terjadi sepanjang hari ini. Ceritakan alur koordinasi kerja, diskusi penting, percakapan keluarga/pribadi, kendala yang dihadapi, dan dinamika hari tersebut secara utuh.]

---

## 📋 Rincian Aktivitas & Rekapitulasi

### 1. ✅ Yang Sudah Dilakukan (Completed)
- [x] **[Judul Aktivitas/Tugas yang Selesai]** (👤 Pelaksana): Rincian apa yang telah selesai dikerjakan atau disepakati hari ini.
*(Jika tidak ada, tuliskan: - Tidak ada aktivitas yang terselesaikan secara eksplisit hari ini.)*

### 2. ⏳ Yang Harus / Belum Dilakukan (Action Items & To-Do List)
- [ ] **[Judul Tugas yang Harus Dikerjakan]** [PRIORITAS: HIGH/MEDIUM/LOW | 👤 @PenanggungJawab | ⏰ Deadline: YYYY-MM-DD]: Detail konteks tindakan yang harus diselesaikan.
*(Jika tidak ada, tuliskan: - Tidak ada to-do list tertunda.)*

### 3. 📅 Jadwal, Agenda & Rencana Kedepan
- **[Waktu / Tanggal / Agenda]**: Rincian rencana pertemuan, jadwal kepulangan/keberangkatan, tenggat waktu, rencana main/kumpul, jadwal kuliah/kantor.
*(Jika tidak ada, tuliskan: - Tidak ada jadwal agenda khusus yang tercatat.)*

### 4. 💰 Pembayaran, Nota & Transaksi Keuangan
- **[Rincian Transaksi/Nota/Upah]**: Nominal angka uang (Rp), rincian belanja material/makanan, status verifikasi/transfer (lunas / belum bayar), metode pencocokan nota, tagihan, dsb.
*(Jika tidak ada, tuliskan: - Tidak ada transaksi keuangan atau nota pada hari ini.)*

### 5. 🎙️ Media, Lampiran & Pesan Suara
- **[Foto / Gambar]**: Foto nota belanja, foto berkas/TTD dokumen, screenshot, dsb.
- **[Voice Note / Audio]**: Rekaman suara / pesan suara yang dikirimkan beserta konteksnya.
- **[Dokumen / File]**: Berkas PDF/Word/Excel atau link yang dibagikan.
*(Jika tidak ada media, sebutkan tidak ada media yang dikirimkan hari ini).*

---

## 💬 Rincian Percakapan per Kontak & Grup (Seluruh Percakapan)
(Tuliskan poin-poin percakapan untuk SETIAP kontak dan grup yang ada di log secara lengkap, jangan ada kontak yang dilewati)
### • [Nama Kontak / Grup 1]
- **[Waktu] [Pengirim]**: Uraian isi percakapan, tanggapan, dan konteksnya.
- ...

### • [Nama Kontak / Grup 2]
- **[Waktu] [Pengirim]**: Uraian isi percakapan...

3. EXTRACTION OF TODOS:
Extract all actionable tasks into the "todos" array:
- "title": Actionable task title.
- "description": Context or details.
- "priority": "high", "medium", or "low".
- "assignee": Responsible person if mentioned, otherwise null.
- "deadline": Target date "YYYY-MM-DD" if mentioned, otherwise null.

4. Respond ONLY with a valid JSON object matching this schema:
{
  "summary": "string containing rich comprehensive summary narrative",
  "markdown": "string containing the full, beautiful GitHub-flavored markdown report following the exact template above",
  "highlights": ["string"],
  "decisions": ["string"],
  "todos": [
    {
      "title": "string",
      "description": "string or null",
      "priority": "high" | "medium" | "low",
      "assignee": "string or null",
      "deadline": "YYYY-MM-DD or null"
    }
  ]
}`;
};
