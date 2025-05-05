import { Link } from '../components/common/RouterLink';

interface AuthPageLayoutProps {
  children: React.ReactNode;
  title: string;
  linkText: string;
  linkTo: string;
}

const AuthPageLayout = ({ children, title, linkText, linkTo }: AuthPageLayoutProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-boxdark-2 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-boxdark sm:p-8">
        <h2 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h2>
        <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
          {linkText}{" "}
          <Link
            to={linkTo}
            className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
          >
            {linkText}
          </Link>
        </p>
        {children}
      </div>
    </div>
  );
};

export default AuthPageLayout; 