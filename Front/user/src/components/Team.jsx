import React from "react";
import { useTranslation } from "react-i18next";
import { FaWhatsapp } from "react-icons/fa";
import "./Team.css";

export const Team = (props) => {
  const { t } = useTranslation();
  
  // WhatsApp numbers for each team member
  const whatsappNumbers = {
    "Chaima Nouali": "50962694",
    "Bechir Garali": "26455505",
    "Amenallah Belhouichet": "58287224",
    "Ayoub Hanfi": "50343139"
  };
  
  // Function to open WhatsApp with the specified number
  const openWhatsApp = (name) => {
    if (whatsappNumbers[name]) {
      const whatsappUrl = `https://wa.me/216${whatsappNumbers[name]}`;
      window.open(whatsappUrl, '_blank');
    }
  };
  
  return (
    <div id="team" className="text-center">
      <div className="container">
        <div className="col-md-8 col-md-offset-2 section-title">
          <h2>{t('team.title')}</h2>
          <p>
            {t('team.description')}
          </p>
        </div>
        <div id="row">
          {props.data
            ? props.data.map((d, i) => (
                <div key={`${d.name}-${i}`} className="col-md-3 col-sm-6 team">
                  <div className="thumbnail">
                    {" "}
                    <img src={d.img} alt="..." className="team-img" />
                    <div className="caption">
                      <h4>{d.name}</h4>
                      <p>{d.job}</p>
                      {whatsappNumbers[d.name] && (
                        <button 
                          onClick={() => openWhatsApp(d.name)}
                          className="whatsapp-btn"
                          title={`Contact ${d.name} on WhatsApp`}
                        >
                          <FaWhatsapp size={20} color="#FF0000" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            : "loading"}
        </div>
      </div>
    </div>
  );
};
