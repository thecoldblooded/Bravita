import { useTranslation } from "react-i18next";

const ingredients = [
  { name: "Citicoline", amount: "300 mg", percent: "-" },
  { name: "L-Arjinin", amount: "250 mg", percent: "-" },
  { name: "Taurin", amount: "83.333 mg", percent: "-" },
  { name: "Vitamin C", amount: "66.667 mg", percent: "84%" },
  { name: "Fosfotidilserin", amount: "10 mg", percent: "-" },
  { name: "Vitamin B3 (Niyasin)", amount: "10 mg", percent: "62%" },
  { name: "Çinko", amount: "5 mg", percent: "50%" },
  { name: "Vitamin B5", amount: "4.333 mg", percent: "72%" },
  { name: "Vitamin B2", amount: "1.1 mg", percent: "79%" },
  { name: "Vitamin B1", amount: "1 mg", percent: "91%" },
  { name: "Vitamin E", amount: "1 mg", percent: "83%" },
  { name: "Mangan", amount: "0.84 mg", percent: "30%" },
  { name: "Vitamin B6", amount: "0.6 mg", percent: "43%" },
  { name: "Retinil Palmitat", amount: "0.4 mg", percent: "50%" },
  { name: "Vitamin B9 (Folik Asit)", amount: "0.133 mg", percent: "66%" },
  { name: "İyot", amount: "0.075 mg", percent: "50%" },
  { name: "Krom", amount: "0.058 mg", percent: "145%" },
  { name: "Selenyum", amount: "0.0562 mg", percent: "102%" },
  { name: "Molibden", amount: "0.03 mg", percent: "50%" },
  { name: "Biyotin", amount: "0.015 mg", percent: "30%" },
  { name: "Vitamin D", amount: "0.01 mg (400 IU)", percent: "200%" },
  { name: "Vitamin B12", amount: "0.002 mg", percent: "80%" },
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

        <div className="max-w-4xl mx-auto bg-card rounded-3xl shadow-card overflow-hidden border border-border">
          <div className="bg-primary/10 px-6 py-4 grid grid-cols-3 gap-4 font-bold text-xs md:text-base">
            <span>{t('ingredients.header_name')}</span>
            <span className="text-center">{t('ingredients.header_amount')}</span>
            <span className="text-right">{t('ingredients.header_nrv')}</span>
          </div>

          <div className="divide-y divide-border">
            {ingredients.map((ingredient, index) => (
              <div
                key={ingredient.name}
                className={`px-6 py-3 grid grid-cols-3 gap-4 text-xs md:text-base hover:bg-secondary/30 transition-colors ${index % 2 === 0 ? 'bg-secondary/10' : ''
                  }`}
              >
                <span className="font-medium">{ingredient.name}</span>
                <span className="text-center text-muted-foreground">{ingredient.amount}</span>
                <span className="text-right font-semibold text-primary">{ingredient.percent}</span>
              </div>
            ))}
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
