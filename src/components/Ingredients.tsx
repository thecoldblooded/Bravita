import { useTranslation } from "react-i18next";

const ingredients = [
  { key: "citicoline", amount5ml: "300", nrv5ml: "-", amount10ml: "600", nrv10ml: "-" },
  { key: "l_arginine", amount5ml: "250", nrv5ml: "-", amount10ml: "500", nrv10ml: "-" },
  { key: "taurine", amount5ml: "83.333", nrv5ml: "-", amount10ml: "166.666", nrv10ml: "-" },
  { key: "vitamin_c", amount5ml: "66.667", nrv5ml: "84", amount10ml: "133.334", nrv10ml: "266.668" },
  { key: "phosphatidylserine", amount5ml: "10", nrv5ml: "-", amount10ml: "20", nrv10ml: "-" },
  { key: "vitamin_b3", amount5ml: "10", nrv5ml: "62", amount10ml: "20", nrv10ml: "124" },
  { key: "zinc", amount5ml: "5", nrv5ml: "50", amount10ml: "10", nrv10ml: "100" },
  { key: "vitamin_b5", amount5ml: "4.333", nrv5ml: "72", amount10ml: "8.666", nrv10ml: "144" },
  { key: "vitamin_b2", amount5ml: "1.1", nrv5ml: "79", amount10ml: "2.2", nrv10ml: "158" },
  { key: "vitamin_b1", amount5ml: "1", nrv5ml: "91", amount10ml: "2", nrv10ml: "182" },
  { key: "vitamin_e", amount5ml: "1", nrv5ml: "83", amount10ml: "2", nrv10ml: "166" },
  { key: "manganese", amount5ml: "0.84", nrv5ml: "30", amount10ml: "1.68", nrv10ml: "60" },
  { key: "vitamin_b6", amount5ml: "0.6", nrv5ml: "43", amount10ml: "1.2", nrv10ml: "86" },
  { key: "retinyl_palmitate", amount5ml: "0.4", nrv5ml: "50", amount10ml: "0.8", nrv10ml: "100" },
  { key: "vitamin_b9", amount5ml: "0.133", nrv5ml: "66", amount10ml: "0.266", nrv10ml: "132" },
  { key: "iodine", amount5ml: "0.075", nrv5ml: "50", amount10ml: "0.15", nrv10ml: "100" },
  { key: "chromium", amount5ml: "0.058", nrv5ml: "145", amount10ml: "0.116", nrv10ml: "290" },
  { key: "selenium", amount5ml: "0.0562", nrv5ml: "102", amount10ml: "0.1124", nrv10ml: "204" },
  { key: "molybdenum", amount5ml: "0.03", nrv5ml: "50", amount10ml: "0.06", nrv10ml: "100" },
  { key: "biotin", amount5ml: "0.015", nrv5ml: "30", amount10ml: "0.03", nrv10ml: "60" },
  { key: "vitamin_d", amount5ml: "0,01 (400 IU)", nrv5ml: "200", amount10ml: "0,02 (800 IU)", nrv10ml: "400" },
  { key: "vitamin_b12", amount5ml: "0.002", nrv5ml: "80", amount10ml: "0.004", nrv10ml: "160" },
];

const Ingredients = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 md:py-32 bg-bravita-cream/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-primary font-bold text-sm uppercase tracking-wider">{t('ingredients.badge')}</span>
          <h2 className="text-3xl md:text-5xl font-extrabold mt-2 mb-4">
            {t('ingredients.title')} <span className="text-gradient">{t('ingredients.title_accent')}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('ingredients.description')}
          </p>
        </div>

        <div className="max-w-6xl mx-auto bg-card rounded-3xl shadow-card overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-primary/10">
                <tr className="text-xs md:text-base">
                  <th className="px-6 py-4 text-left font-bold">{t('ingredients.header_name')}</th>
                  <th className="px-6 py-4 text-center font-bold">{t('ingredients.header_amount_5ml')}</th>
                  <th className="px-6 py-4 text-center font-bold">{t('ingredients.header_nrv_5ml')}</th>
                  <th className="px-6 py-4 text-center font-bold">{t('ingredients.header_amount_10ml')}</th>
                  <th className="px-6 py-4 text-right font-bold">{t('ingredients.header_nrv_10ml')}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {ingredients.map((ingredient, index) => (
                  <tr
                    key={ingredient.key}
                    className={`text-xs md:text-base hover:bg-secondary/30 transition-colors ${index % 2 === 0 ? 'bg-secondary/10' : ''}`}
                  >
                    <td className="px-6 py-3 font-medium">{t(`ingredients.items.${ingredient.key}`)}</td>
                    <td className="px-6 py-3 text-center text-muted-foreground">{ingredient.amount5ml}</td>
                    <td className="px-6 py-3 text-center font-semibold text-primary">{ingredient.nrv5ml}</td>
                    <td className="px-6 py-3 text-center text-muted-foreground">{ingredient.amount10ml}</td>
                    <td className="px-6 py-3 text-right font-semibold text-primary">{ingredient.nrv10ml}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-muted-foreground text-sm mt-6 max-w-2xl mx-auto">
          {t('ingredients.nrv_desc')}
        </p>
      </div>
    </section>
  );
};

export default Ingredients;
