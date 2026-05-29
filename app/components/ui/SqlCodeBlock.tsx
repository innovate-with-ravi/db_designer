// components/SqlCodeBlock.tsx
'use client'

export default function SqlCodeBlock({ html }: { html: string }) {
    return <div dangerouslySetInnerHTML={{ __html: html }} />
}
