import bravitaBottle from "@/assets/bravita-bottle.png";
import { FeatureSteps } from "@/components/ui/feature-steps";
import heroImage from "@/assets/Geleceğin Kahramanları İçin.jpeg";
import globalImage from "@/assets/Türkiye'den Dünyaya.jpeg";
import strengthImage from "@/assets/Gücün Kaynağı.jpeg";

const About = () => {
  return (
    <section id="about" className="py-20 md:py-32 bg-gradient-to-b from-bravita-cream/30 to-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="order-2 lg:order-1">
            <span className="text-bravita-orange font-bold tracking-wider text-sm uppercase mb-2 block">Hakkımızda</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mt-2 mb-4">
              Geleceğe Sağlıkla <span className="text-transparent bg-clip-text bg-gradient-to-r from-bravita-yellow via-bravita-orange to-bravita-red">Büyüyen Nesiller</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Her ailenin en büyük hayalinin, çocuklarının sağlıkla ve mutlulukla büyüdüğünü görmek olduğuna inanıyoruz.
              Bu yolda, onların sağlıklı gelişimlerini destekleyecek ve potansiyellerini açığa çıkarmalarına
              yardımcı olacak en değerli desteği sunmak için var gücümüzle çalışıyoruz.
            </p>
            <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
              <div className="w-12 h-12 rounded-full bg-bravita-green/10 flex items-center justify-center">
                <span className="text-2xl">🔬</span>
              </div>
              <div>
                <p className="font-bold">Bilimle Desteklenen Gelişim</p>
                <p className="text-muted-foreground text-sm">Uluslararası standartlarda yürütülen bilimsel araştırmalar</p>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-bravita-yellow/40 to-bravita-orange/40 rounded-full blur-3xl scale-90" />
              <img
                src={bravitaBottle}
                alt="Bravita"
                className="relative z-10 w-64 md:w-80 animate-float-slow"
              />
            </div>
          </div>
        </div>

        {/* Values via FeatureSteps */}
        <div className="mt-16">
          <FeatureSteps
            features={[
              {
                step: 'Misyon',
                title: 'Geleceğin Kahramanları İçin',
                content: 'Her çocuğun içinde keşfedilmeyi bekleyen bir kahraman yatar. Bravita, bu potansiyeli ortaya çıkarmanın sağlıklı bir temel atmaktan geçtiğine inanır.',
                image: heroImage
              },
              {
                step: 'Vizyon',
                title: "Türkiye'den Dünyaya",
                content: "Bu topraklarda doğan bir marka olarak, gücümüzü insanımızın sağlık ihtiyaçlarından alıyoruz. Dünya genelinde ailelerin güvendiği bir marka olma vizyonuyla ilerliyoruz.",
                image: globalImage
              },
              {
                step: 'Motto',
                title: 'Gücün Kaynağı',
                content: 'Modern hayatın koşturmacasında zinde kalmak için "Büyümenin Formülü Burada" mottosuyla günlük beslenmenize pratik bir destek sunuyoruz.',
                image: strengthImage
              }
            ]}
            title="Değerlerimiz"
            autoPlayInterval={5000}
            imageHeight="h-[400px]"
            className="bg-transparent"
          />
        </div>
      </div>
    </section>
  );
};
      </div >
    </section >
  );
};

export default About;
