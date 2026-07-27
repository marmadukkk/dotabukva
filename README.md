# DOTA-BUKVA — Desktop

**Десктоп-версия Dota-Bukva** (Electron) для Linux и Windows.

Игра: крути барабан, описывай, отгадывай. Веб-клиент и десктоп используют один и тот же React UI.

## Текущая версия

**Актуальная сборка доступна в [Releases](https://github.com/marmadukkk/dotabukva/releases).**

Скачай установщик или portable `.exe` для Windows, либо AppImage/deb для Linux — без сборки из исходников.

| Платформа | Формат |
|-----------|--------|
| Windows | Setup `.exe` (NSIS), portable `.exe` |
| Linux | `.AppImage`, `.deb` |

Версия десктопа: **1.1-desktop** (LAN multiplayer).

## Мультиплеер по LAN (десктоп)

1. **Хост** (ведущий): «Создать комнату» → появится код и **IP:порт** (например `192.168.0.12:17432`).
2. **Гости** в той же Wi‑Fi: «Список комнат» → ввести IP хоста, порт `17432` и код комнаты → Войти.
3. Хост жмёт **«Начать игру»** → ведущий крутит барабан, у всех синхронизируется результат и вычёркивания.

Порт по умолчанию: **17432** (открой в файрволе при необходимости).

## Быстрый старт (из исходников)

```bash
git clone https://github.com/marmadukkk/dotabukva.git
cd dotabukva
git checkout desktop
npm install
```

### Разработка

```bash
# только веб
npm run dev

# Electron + Vite
npm run electron:dev
```

### Сборка десктопа

```bash
# под текущую ОС
npm run electron:build

# Linux
npm run electron:build:linux

# Windows (.exe) — удобнее собирать на Windows
npm run electron:build:win
```

Готовые файлы: папка `release/`.

## Структура

- `src/` — React-приложение (меню, барабан, таблицы, звуки, настройки)
- `electron/` — main/preload Electron
- `public/` — видео, звуки, иконки
- `electron/resources/` — иконка приложения (`icon.png` / `icon.ico`)

## Контакты

- Автор: [@mrmdkkkk](https://t.me/mrmdkkkk) / GitHub: [marmadukkk](https://github.com/marmadukkk)

## Лицензия / дисклеймер

Проект создан в **учебных целях**, open-source, **не является коммерческим продуктом**.  
Ассеты взяты из открытых источников. Dota 2 — торговая марка Valve Corporation.

---

Веб-версия и другие ветки: [github.com/marmadukkk/dotabukva](https://github.com/marmadukkk/dotabukva)
