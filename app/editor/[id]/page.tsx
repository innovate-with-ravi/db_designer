import EditorPage from '@/app/components/EditorPage'
import { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params; //  Works perfectly

  return {
    title: `${id}-er`,
  };
}


const page = async () => {

  return (
    <EditorPage />
  )
}

export default page