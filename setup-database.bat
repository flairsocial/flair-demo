@echo off
REM Database Setup Script for Flair Social (Windows)
REM This script installs database dependencies when you're ready to migrate

echo 🚀 Setting up database dependencies for Flair Social...
echo.

echo Choose your database provider:
echo 1. Supabase (Recommended - PostgreSQL with real-time features)
echo 2. Local PostgreSQL  
echo 3. PlanetScale (MySQL-based)
echo 4. Skip database setup for now
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo 📦 Installing Supabase dependencies...
    npm install drizzle-orm @supabase/supabase-js
    npm install -D drizzle-kit
    echo ✅ Supabase dependencies installed!
    echo 📝 Next steps:
    echo    1. Create a Supabase project at https://supabase.com
    echo    2. Add DATABASE_URL to your .env.local
    echo    3. Run: npm run db:setup
) else if "%choice%"=="2" (
    echo 📦 Installing PostgreSQL dependencies...
    npm install drizzle-orm pg
    npm install -D drizzle-kit @types/pg
    echo ✅ PostgreSQL dependencies installed!
    echo 📝 Next steps:
    echo    1. Install PostgreSQL locally
    echo    2. Create database: createdb flair_social
    echo    3. Add DATABASE_URL to your .env.local
    echo    4. Run: npm run db:setup
) else if "%choice%"=="3" (
    echo 📦 Installing PlanetScale dependencies...
    npm install drizzle-orm @planetscale/database
    npm install -D drizzle-kit
    echo ✅ PlanetScale dependencies installed!
    echo 📝 Next steps:
    echo    1. Create a PlanetScale database
    echo    2. Add DATABASE_URL to your .env.local
    echo    3. Run: npm run db:setup
) else if "%choice%"=="4" (
    echo ⏭️  Skipping database setup. Enhanced file-based storage will continue to work.
) else (
    echo ❌ Invalid choice. Please run the script again.
    exit /b 1
)

echo.
echo 🔧 Adding database scripts to package.json...

REM Add database scripts to package.json
node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); pkg.scripts = pkg.scripts || {}; pkg.scripts['db:generate'] = 'drizzle-kit generate:pg'; pkg.scripts['db:push'] = 'drizzle-kit push:pg'; pkg.scripts['db:studio'] = 'drizzle-kit studio'; pkg.scripts['db:setup'] = 'npm run db:generate && npm run db:push'; pkg.scripts['db:migrate'] = 'node -e \"console.log(\\\"Migration script would run here\\\")\"'; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2)); console.log('✅ Database scripts added to package.json');"

echo.
echo 🎉 Setup complete! Your current file-based system will continue working.
echo When you're ready to migrate to database:
echo    1. Set up your chosen database
echo    2. Add DATABASE_URL to .env.local  
echo    3. Add USE_DATABASE=true to .env.local
echo    4. Run: npm run db:setup
echo.
echo Monitor your app's performance at: http://localhost:3000/api/health

pause
