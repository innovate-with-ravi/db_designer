'use server'
import { codeToHtml } from 'shiki'

export async function generateSqlHtml(sql: string): Promise<string> {
    const html = await codeToHtml(sql, {
        lang: 'sql',
        theme: 'github-dark'
    })
    return html
}
