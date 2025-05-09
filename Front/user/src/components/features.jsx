import React from "react";
import { useTranslation } from "react-i18next";

export const Features = (props) => {
  const { t } = useTranslation();
  
  return (
    <div id="features" className="text-center">
      <div className="container">
        <div className="col-md-10 col-md-offset-1 section-title">
          <h2>{t('features.title')}</h2>
          <p>{t('features.description')}</p>
        </div>
        <div className="row">
          {props.data
            ? props.data.map((d, i) => (
                <div key={`${d.title}-${i}`} className="col-xs-6 col-md-3">
                  {" "}
                  <i className={d.icon}></i>
                  <h3>{d.title}</h3>
                  <p>{d.text}</p>
                </div>
              ))
            : t('common.loading')}
        </div>
      </div>
    </div>
  );
};
