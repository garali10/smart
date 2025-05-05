import { NavLink, useLocation } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    {
      title: 'Dashboard',
      link: '/',
    },
    {
      title: 'Team Management',
      link: '/team',
    },
    {
      title: 'Job Management',
      link: '/jobs',
    },
    {
      title: 'Calendar',
      link: '/calendar',
    }
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-72.5 border-r border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
          <img src="/images/logo/logo.svg" alt="Logo" />
        </div>

        {/* Menu Items */}
        <div className="flex flex-col overflow-y-auto duration-300">
          {menuItems.map((item) => (
            <NavLink
              key={item.link}
              to={item.link}
              className={({ isActive }) => 
                `flex items-center py-3 px-6 ${
                  isActive 
                    ? "bg-primary text-white" 
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`
              }
            >
              <span className="font-medium">{item.title}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar; 