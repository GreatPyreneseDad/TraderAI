# Render PostgreSQL Connection Guide

## Connection Details

- **Host**: `dpg-d25eounfte5s738440jg-a.virginia-postgres.render.com`
- **Port**: `5432` (default PostgreSQL port)
- **Database**: `trader_ai`
- **Username**: `trader_ai_user`
- **Password**: `trader_ai_password_2024`

## TablePlus Connection Setup

1. Open TablePlus
2. Create New Connection → PostgreSQL
3. Enter the following:

```
Name: TraderAI Render
Host: dpg-d25eounfte5s738440jg-a.virginia-postgres.render.com
Port: 5432
User: trader_ai_user
Password: trader_ai_password_2024
Database: trader_ai
SSL Mode: Require (Important for Render!)
```

## Important Notes

1. **SSL Required**: Render requires SSL connections. Make sure to set SSL Mode to "Require" in TablePlus.

2. **Connection String Format**:
```
postgresql://trader_ai_user:trader_ai_password_2024@dpg-d25eounfte5s738440jg-a.virginia-postgres.render.com:5432/trader_ai?sslmode=require
```

3. **Environment Variable**: Update your `.env` file:
```env
DATABASE_URL=postgresql://trader_ai_user:trader_ai_password_2024@dpg-d25eounfte5s738440jg-a.virginia-postgres.render.com:5432/trader_ai?sslmode=require
```

## Setup Steps

1. **Connect to Render Database**:
   - Use TablePlus with SSL Mode = Require
   - Or use psql: `psql "postgresql://trader_ai_user:trader_ai_password_2024@dpg-d25eounfte5s738440jg-a.virginia-postgres.render.com:5432/trader_ai?sslmode=require"`

2. **Run Setup Script**:
   - Open `render-setup.sql` in TablePlus
   - Execute the script

3. **Run Prisma Migrations**:
   ```bash
   cd /Users/chris/Desktop/TraderAI
   npx prisma migrate deploy
   ```

4. **Verify Connection**:
   ```bash
   npm run db:verify
   ```

## Troubleshooting

- **SSL Connection Error**: Make sure `?sslmode=require` is in your connection string
- **Permission Denied**: The database owner might be different on Render. Contact Render support if needed.
- **Connection Timeout**: Check if your IP is allowed in Render's database settings

## Render Dashboard

Access your database dashboard at:
https://dashboard.render.com/

Look for your PostgreSQL service to manage connections, view logs, and monitor performance.