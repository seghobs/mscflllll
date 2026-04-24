import re
from google import genai
from google.genai import types
from .gemini_config import API_KEY, TEXT_MODEL, _text_config, call_with_timeout

def generate_seo_title(song_title, lyrics=""):
    def _do():
        client = genai.Client(api_key=API_KEY)
        model = TEXT_MODEL

        prompt = f"""Google'da ara: "{song_title}" şarkısının orijinal sanatçısı kim?
        
Bu şarkının orijinal sanatıcısını bulduktan sonra, YouTube'da KEŞFETE DÜŞECEK ve VİRAL OLACAK bir cover başlığı üret.

FORMAT: Şarkı Adı | Sanatçı İsmi ( Cover Türü )

Cover türleri: Efsane Cover, Akustik Cover, Duygusal Cover, Piano Cover, Yeni Versiyon, İlk Kez Coverlandı
(şarkının ruhuna en uygun olanı seç)

KURALLAR:
- SADECE başlığı yaz, başka hiçbir şey yazma
- Tırnak işareti KULLANMA
- 80 karakteri geçme
- Türkü/anonim ise "Anonim" yaz"""

        contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt)])]
        config = _text_config()
        response_text = ""
        for chunk in client.models.generate_content_stream(model=model, contents=contents, config=config):
            if chunk.text: response_text += chunk.text
        return response_text.strip().strip('"').strip("'")

    return call_with_timeout(_do, timeout=120)


def generate_seo_description(song_title, lyrics=""):
    def _do():
        client = genai.Client(api_key=API_KEY)
        model = TEXT_MODEL

        prompt = f"""Sen YouTube müzik kanallarını KEŞFETE ÇIKARAN bir SEO dahisisin.

Google'da şu aramayı yap: "{song_title}" şarkısı kimin, hangi tür, ne zaman çıktı, ne kadar popüler?

Arama sonuçlarına göre bu şarkı için YouTube AÇIKLAMA yaz.

AÇIKLAMA YAPISI (kesinlikle uygula):
1. İLK 2 SATIR: İnsanın tıklamasını zorlayan bir hook cümle. Bu kısım YouTube arama sonuçlarında görünür, KRİTİK.
2. Şarkı hakkında: Orijinal sanatçı, şarkı türü, çıkış yılı, şarkıdaki duygu
3. Cover versiyonumuzun farkı: Neden bu cover'ı dinlemeli, ne katıyor
4. Etkileşim: "Yorumlara şarkının en sevdiğiniz kısmını yazın", "Beğenmeyi unutmayın", "Kanalımıza abone olun"
5. SEO cümleleri: İnsanların arayabileceği kelimeleri doğal şekilde ekle
6. 10-15 hashtag: #cover #sanatçıismi #şarkıismi #türkçemüzik #müzik #viral #şarkıözleri gibi

ÖNEMLİ:
- İnsanlar bu şarkıyı aradığında VİDEOMUZ çıksın diye yaz
- YouTube algoritması bu açıklamayı okuyup "bu video ilgili" desin
- 200-400 kelime
- Emoji kullan (🎵🎶🎤)
- SADECE açıklamayı yaz"""

        contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt)])]
        config = _text_config()
        response_text = ""
        for chunk in client.models.generate_content_stream(model=model, contents=contents, config=config):
            if chunk.text: response_text += chunk.text
        return response_text.strip()

    return call_with_timeout(_do, timeout=120)


def generate_seo_tags(song_title, lyrics=""):
    def _do():
        client = genai.Client(api_key=API_KEY)
        model = TEXT_MODEL

        prompt = f"""Sen YouTube müzik videolarını KEŞFETE ÇIKARAN bir SEO uzmanısın.

Google'da şu aramaları yap:
1. "{song_title}" YouTube'da en çok aranan kelimeler neler?
2. "{song_title}" cover YouTube trending etiketler
3. Bu şarkı türü için en popüler YouTube müzik etiketleri 2026

Bu arama sonuçlarına göre, videomuzun KEŞFETE DÜŞMESİ için en etkili 30-40 etiket üret.

ETİKET KATEGORİLERİ:
1. Şarkı + Orijinal Sanatçı (5-6 etiket): "şarkı adı", "sanatçı adı", "şarkı adı cover", "sanatçı cover"
2. Cover Türü (3-4 etiket): "cover", "efsane cover", "akustik cover", "piano cover"
3. Şarkı Sözleri (3-4 etiket): "şarkı sözleri", "lyric video", "lyrics", "sözleri"
4. Müzik Türü (3-4 etiket): Pop, rock, türkü, arabesk vs (şarkıya göre)
5. Mood/Duygu (3-4 etiket): "duygusal şarkı", "aşk şarkısı", "hüzünlü müzik" vs
6. Trend/Arama (5-6 etiket): "yeni şarkı 2026", "en iyi coverlar", "viral şarkı", "trend müzik"
7. Benzer Sanatçılar (3-4 etiket): Bu türe yakın popüler sanatçı isimleri
8. Genel (3-4 etiket): "müzik", "türkçe müzik", "türkçe pop", "şarkı dinle"

KURALLAR:
- Virgülle ayrılmış tek satırda yaz
- SADECE etiketleri yaz, başka hiçbir şey yazma
- İnsanların YouTube'da arayacağı kelimeleri kullan
- Her etiket videomuzun bulunmasını sağlasın"""

        contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt)])]
        config = _text_config()
        response_text = ""
        for chunk in client.models.generate_content_stream(model=model, contents=contents, config=config):
            if chunk.text: response_text += chunk.text
        return response_text.strip()

    return call_with_timeout(_do, timeout=120)


def generate_youtube_metadata(song_title, lyrics=""):
    title = generate_seo_title(song_title, lyrics)
    description = generate_seo_description(song_title, lyrics)
    tags = generate_seo_tags(song_title, lyrics)
    return f"🌟 BAŞLIK ÖNERİSİ:\n{title}\n\n📝 YOUTUBE AÇIKLAMASI:\n{description}\n\n🏷️ YOUTUBE ETİKETLERİ:\n{tags}"


def optimize_existing_video(video_title):
    def _do():
        client = genai.Client(api_key=API_KEY)
        model = TEXT_MODEL

        prompt = f"""Sen YouTube müzik videolarını KEŞFETE ÇIKARAN ve VİRAL YAPAN bir SEO dahisisin.

Bu YouTube videosu düşük izlenme alıyor, KEŞFETE DÜŞMÜYOR:
"{video_title}"

Google'da ara: Bu video başlığıyla ilgili en çok aranan kelimeler neler? Bu şarkı/tür için trend etiketler neler?

Ardından 3 şey üret:

1. YENİ BAŞLIK (bu videoyu keşfete çıkaracak, tıklama çekici)
2. YENİ AÇIKLAMA (SEO bazlı, aramalarda çıksın diye optimize edilmiş)
3. YENİ ETİKETLER (Google'da en çok aranan kelimelerden oluşan 30-40 etiket)

KURALLAR:
- Şu formatı kullan:

BAŞLIK:
[yeni başlık buraya]

AÇIKLAMA:
[yeni açıklama buraya]

ETİKETLER:
[virgülle ayrılmış etiketler buraya]

- Başlık: Orijinal şarkıyı ve sanatçıyı koru ama daha çekici hale getir
- Açıklama: 200-300 kelime, SEO cümleleri, hashtag'ler
- Etiketler: 30-40 adet, insanların arayacağı kelimeler"""

        contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt)])]
        config = _text_config()
        response_text = ""
        for chunk in client.models.generate_content_stream(model=model, contents=contents, config=config):
            if chunk.text: response_text += chunk.text

        text = response_text.strip()

        title = ""
        desc = ""
        tags = ""

        title_match = re.search(r'BAŞLIK:\s*\n(.*?)(?=\n*AÇIKLAMA:)', text, re.DOTALL | re.IGNORECASE)
        desc_match = re.search(r'AÇIKLAMA:\s*\n(.*?)(?=\n\s*ETİKETLER:)', text, re.DOTALL | re.IGNORECASE)
        tags_match = re.search(r'ETİKETLER:\s*\n(.*)', text, re.DOTALL | re.IGNORECASE)

        if title_match: title = title_match.group(1).strip()
        if desc_match: desc = desc_match.group(1).strip()
        if tags_match: tags = tags_match.group(1).strip()

        if not title: title = text[:100]
        if not desc: desc = text
        if not tags: tags = ""

        return {"title": title, "description": desc, "tags": tags}

    return call_with_timeout(_do, timeout=120)
