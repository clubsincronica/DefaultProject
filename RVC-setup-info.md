# RVC Voice Cloning on Windows + Python 3.13 + FFmpeg 8.1.2

## Main Repository
- **GitHub**: https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI
- **Stars**: 38.8k, actively maintained
- **Latest release**: 2.3.260718 (July 2026)

## Python 3.13 on Windows

The repo targets Python 3.12, but 3.13 works with minor adjustments:

### Install Steps

1. **Create venv**:
   ```
   py -3.13 -m venv .venv
   .venv\Scripts\activate
   ```

2. **FFmpeg 8.1.2**: Download from Hugging Face and place in project root:
   - `ffmpeg.exe`: https://huggingface.co/lj1995/VoiceConversionWebUI/resolve/main/ffmpeg.exe
   - `ffprobe.exe`: https://huggingface.co/lj1995/VoiceConversionWebUI/resolve/main/ffprobe.exe

3. **Install dependencies** (choose your hardware path):

   **CPU / AMD / Intel (DirectML on Windows)**:
   ```
   python -m pip install -r requirments_cpu_py312.txt
   ```

   **NVIDIA GPU + CUDA 11.8**:
   ```
   python -m pip install torch==2.7.1+cu118 torchaudio==2.7.1+cu118 \
     --index-url https://download.pytorch.org/whl/cu118 \
     --extra-index-url https://pypi.org/simple
   python -m pip install -r requirments_cu118_py312.txt
   ```

   **NVIDIA GPU + CUDA 12.8**:
   ```
   python -m pip install torch==2.7.1+cu128 torchaudio==2.7.1+cu128 \
     --index-url https://download.pytorch.org/whl/cu128 \
     --extra-index-url https://pypi.org/simple
   python -m pip install -r requirments_cu128_py312.txt
   ```

4. **Download pre-trained models**:
   ```
   hf download lj1995/VoiceConversionWebUI --revision main \
     --include "hubert_base/*" --local-dir assets
   hf download lj1995/VoiceConversionWebUI rmvpe.pt --revision main \
     --local-dir assets/rmvpe
   ```

### Known Issues with Python 3.13
- Requirements files named `*py312*` may need renaming or pip may auto-resolve
- Some native modules (llvmlite) may need Visual C++ Redistributable: https://aka.ms/vs/17/release/vc_redist.x64.exe
- DirectML works on Windows for AMD/Intel GPUs

### Quick Start After Install
```
python webui.py
```
Default port: 7865
Place .pth models in `assets/weights/`, .index files in `assets/indices/`