import os
import uuid
import mimetypes
from google import genai
from google.genai import types
from .gemini_config import API_KEY, IMAGE_MODEL, call_with_timeout, save_binary_file

def generate_cover_image(song_title, output_dir, lyrics=""):
    def _do():
        client = genai.Client(api_key=API_KEY)
        model = IMAGE_MODEL

        lyrics_part = f'\nŞarkının sözleri ve duygusal atmosferi (renk ve tema için referans):\n"""\n{lyrics[:600]}\n"""' if lyrics else ""

        prompt = (
            f'SEN: Dünyanın en iyi albüm kapak tasarımcısısın. Spotify, Apple Music, YouTube Music için kapak tasarlıyorsun.\n\n'
            f'GÖREV: "{song_title}" şarkısı için YouTube thumbnail/kapak görseli oluştur.\n\n'
            f'🔴 KESİN YAZI KURALI (EN ÖNEMLİ KURAL):\n'
            f'- Görselde SADECE VE SADECE şu yazı olacak: "{song_title}"\n'
            f'- ASLA sanatçı adı YAZMA\n'
            f'- ASLA albüm adı YAZMA\n'
            f'- ASLA tarih YAZMA\n'
            f'- ASLA "official", "audio", "cover", "music video" YAZMA\n'
            f'- ASLA logo, watermark, küçük yazı YAZMA\n'
            f'- Sadece şarkı ismi. Başka HİÇBİR YAZI yok. Bu kurala KESİNLİKLE uy.\n\n'
            f'🎨 TASARIM KURALLARI (ÇOK ÖNEMLİ):\n'
            f'- Kullanıcı bu kapak resmini gördüğü anda şarkıyı dinlemek istemeli\n'
            f'- Görsel o kadar etkileyici olmalı ki insanlar sırf kapak için tıklasın\n'
            f'- Ultra modern, şık, lüks, sinematik bir tasarım\n'
            f'- Dramatik ışık efektleri: neon glow, lens flare, volumetric ışık\n'
            f'- Derin renk geçişleri, zengin doygun renkler\n'
            f'- Derinlik alanı, bokeh efektleri, parçacık efektleri\n'
            f'- Yazı tipi görselle bütünleşmiş, 3D kabartma veya zarif el yazısı\n'
            f'- Yazı merkezde veya odak noktasında, büyük ve etkileyici\n'
            f'- Spotify editorial playlist kapakları, YouTube trending müzik kapakları kalitesinde\n\n'
            f'SONUÇ: Milyonlarca kişinin tıklayacağı bir kapak olmalı.'
            f'{lyrics_part}'
        )

        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)],
            ),
        ]

        generate_content_config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_level="HIGH"),
            image_config=types.ImageConfig(aspect_ratio="16:9", image_size="1K"),
            response_modalities=["IMAGE", "TEXT"],
            tools=[types.Tool(googleSearch=types.GoogleSearch())],
        )

        for chunk in client.models.generate_content_stream(
            model=model, contents=contents, config=generate_content_config,
        ):
            if chunk.parts is None:
                continue
            if chunk.parts[0].inline_data and chunk.parts[0].inline_data.data:
                inline_data = chunk.parts[0].inline_data
                data_buffer = inline_data.data
                file_extension = mimetypes.guess_extension(inline_data.mime_type) or ".jpg"
                file_name = f"cover_{uuid.uuid4().hex[:8]}"
                full_path = os.path.join(output_dir, f"{file_name}{file_extension}")
                save_binary_file(full_path, data_buffer)
                return f"{file_name}{file_extension}"

        return None

    return call_with_timeout(_do, timeout=300)
