import { Helmet } from 'react-helmet-async';

interface PageMetaProps {
  title: string;
  description?: string;
}

const PageMeta = ({ title, description }: PageMetaProps) => {
  return (
    <Helmet>
      <title>{title} | SmartHire</title>
      {description && <meta name="description" content={description} />}
    </Helmet>
  );
};

export default PageMeta;
