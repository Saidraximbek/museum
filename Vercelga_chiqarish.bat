@echo off
chcp 65001 > nul
title Vercel orqali Internetga Joylash
echo =======================================================
echo   🌐 Saytni Internetga Bepul Joylash (Vercel)
echo =======================================================
echo.
echo 1. Sayt ishlab chiqilmoqda...
call npm run build
echo.
echo 2. Vercel ga bepul yuklanmoqda...
echo (Agar birinchi marta bo'lsa, Vercel hisobingizga kirishni so'rashi mumkin)
echo.
npx vercel --prod
echo.
echo =======================================================
echo Tayyor! Yuqorida ko'rsatilgan havolani (link) Zulfiyaga yuboring!
echo =======================================================
pause
