#!/bin/bash

# Renkler
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== NetGraph Sentinel: PROD Kurulumu ===${NC}"

# 1. Sistem Paketlerini Güncelleme ve Nmap Kurulumu
echo -e "${BLUE}[1/4] Gerekli araçlar (Nmap, Git, Python-dev) kuruluyor...${NC}"
sudo apt-get update
sudo apt-get install -y nmap nmap-common python3-dev build-essential libpq-dev

# 2. Docker Kurulumu (Eğer yoksa)
if ! command -v docker &> /dev/null; then
    echo -e "${BLUE}[2/4] Docker bulunamadı, kuruluyor...${NC}"
    # Resmi Docker kurulum scripti
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    # Şu anki kullanıcıyı docker grubuna ekle
    sudo usermod -aG docker $USER
    echo -e "${GREEN}Docker kuruldu! Grup ayarlarının aktif olması için oturumu kapatıp açmanız gerekebilir.${NC}"
else
    echo -e "${GREEN}[OK] Docker zaten kurulu.${NC}"
fi

# 3. Python Bağımlılıkları
echo -e "${BLUE}[3/4] Python kütüphaneleri kuruluyor...${NC}"
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

echo -e "${GREEN}=== Kurulum Tamamlandı ===${NC}"
echo -e "${BLUE}Lütfen 'backend/.env' dosyasını açıp OPENAI_API_KEY değerini girin.${NC}"
