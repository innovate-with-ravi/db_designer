'use server'
import { codeToHtml } from 'shiki'

// This is a server action; React hooks like useTheme cannot be used here.
// Accept the theme as an argument (e.g. 'dark' or 'light').
export async function generateSqlHtml(sql: string, theme: string): Promise<string> {
    const selectedTheme = theme === 'light' ? 'ayu-light' : 'dark-plus'
    
    const html = await codeToHtml(sql, {
        lang: 'sql',
        theme: selectedTheme
    })
    return html
}
