import React from "react";
import { useTranslation } from "react-i18next";

export const Header = () => {
  const { t } = useTranslation();
  
  return (
    <header id="header">
      <div className="intro">
        <div className="overlay">
          <div className="container">
            <div className="row">
              <div className="col-md-8 col-md-offset-2 intro-text">
                <h1>
                  {t('welcome.title')}
                  <span style={{ color: 'white' }}>{t('welcome.subtitle')}</span>
                </h1>
                <p>{t('welcome.description')}</p>
                <a
                  href="#features"
                  className="btn btn-custom btn-lg page-scroll"
                >
                  {t('welcome.learnMore')}
                </a>{" "}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
