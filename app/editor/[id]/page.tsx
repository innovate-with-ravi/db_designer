import EditorPage from '@/app/components/Editor/EditorPage'
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma'

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params; //  Works perfectly
  const er = await prisma.diagram.findFirst({ where: { id } })

  return {
    title: `${er?.title}`,
  };
}


const page = async () => {

  return (
    <EditorPage />
  )
}

export default page