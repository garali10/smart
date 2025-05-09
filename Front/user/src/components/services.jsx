import React from "react";
import { useTranslation } from "react-i18next";

export const Services = (props) => {
  const { t } = useTranslation();
  
  return (
    <div id="services" className="text-center">
      <div className="container">
        <div className="section-title">
          <h2>{t('services.title')}</h2>
          <p>
            {t('services.description')}
          </p>
        </div>
        <div className="row">
          {props.data
            ? props.data.map((d, i) => (
                <div key={`${d.name}-${i}`} className="col-md-4">
                  <div className="service-item">
                    <i className={d.icon}></i>
                    <div className="service-desc">
                      <h3>{d.name}</h3>
                      <p>{d.text}</p>
                    </div>
                  </div>
                </div>
              ))
            : t('common.loading')}
        </div>
      </div>
    </div>
  );
};
