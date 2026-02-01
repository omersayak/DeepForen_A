#!/bin/bash

# Renkler
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== NetGraph Sentinel Başlatılıyor ===${NC}"

# 1. Docker Kontrolü
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[UYARI] Docker bulunamadı!${NC}"
    echo -e "Veritabanı (PostgreSQL) ve Redis çalışmayacak."
    echo -e "Ancak Arayüz (Frontend) 'Demo Modunda' çalışabilir."
    echo ""
else
    echo -e "${GREEN}[OK] Docker bulundu. Veritabanı başlatılıyor...${NC}"
    docker compose up -d
fi

# 2. Frontend'i Başlatma
echo -e "${BLUE}Arayüz başlatılıyor...${NC}"
echo -e "Lütfen biraz bekleyin, ardından tarayıcınızda şu adrese gidin:"
echo -e "${GREEN}http://localhost:3000${NC}"
echo ""

cd frontend
npm run dev
