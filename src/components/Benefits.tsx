import { Shield, Brain, Heart, Eye, Zap, Bone } from "lucide-react";

import { GlowingShadow } from "@/components/ui/glowing-shadow";

const benefits = [
  {
    icon: Shield,
    title: "Bağışıklık Sistemi",
    description: "C Vitamini, Çinko, B6, A Vitamini, Selenyum, D Vitamini, B12, Demir ve Folik Asit ile bağışıklık sisteminin normal fonksiyonuna yardımcı olur.",
    color: "bravita-green",
    hex: ["#4ade80", "#22c55e"]
  },
  {
    icon: Brain,
    title: "Sinir Sistemi",
    description: "Biyotin, Niyasin, C Vitamini, İyot, B1, B2, B6 ve B12 Vitaminleri sinir sisteminin normal işleyişine yardımcı olur.",
    color: "bravita-purple",
    hex: ["#a855f7", "#9333ea"]
  },
  {
    icon: Zap,
    title: "Enerji Metabolizması",
    description: "C Vitamini, Niyasin, Demir, B2, B6 ve B12 Vitaminleri normal enerji oluşum metabolizmasını destekler, yorgunluk ve bitkinliğin azalmasına katkıda bulunur.",
    color: "bravita-orange",
    hex: ["#f97316", "#ea580c"]
  },
  {
    icon: Bone,
    title: "Kemik Gelişimi",
    description: "D Vitamini, çocuklarda normal büyüme ve kemik gelişimi için gereklidir. Çinko, K Vitamini ve Mangan normal kemiklerin korunmasını destekler.",
    color: "bravita-yellow",
    hex: ["#facc15", "#eab308"]
  },
  {
    icon: Eye,
    title: "Görme Yetisi",
    description: "Çinko, B2 Vitamini ve A Vitamini normal görme yetisinin korunmasına yardımcı olur.",
    color: "bravita-blue",
    hex: ["#3b82f6", "#2563eb"]
  },
  {
    icon: Heart,
    title: "Karaciğer & Kalp",
    description: "Kolin normal karaciğer fonksiyonunun korunmasına yardımcı olur. B1 Vitamini kalbin normal fonksiyonuna katkıda bulunur.",
    color: "bravita-red",
    hex: ["#ef4444", "#dc2626"]
  }
];

const Benefits = () => {
  return (
    <section id="benefits" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-primary font-bold text-sm uppercase tracking-wider">Faydaları</span>
          <h2 className="text-3xl md:text-5xl font-extrabold mt-2 mb-4">
            Çocuğunuzun Sağlıklı <span className="text-gradient">Gelişimi İçin</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Bravita'nın zengin vitamin ve mineral içeriği, çocukların normal büyüme ve gelişimini destekler
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {benefits.map((benefit, index) => (
            <GlowingShadow key={benefit.title}>
              <div
                className="w-full h-full relative z-10 flex flex-col items-start text-left"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <benefit.icon className={`w-7 h-7 text-${benefit.color}`} />
                </div>

                <h3 className="text-xl font-bold mb-3 text-gray-900">{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed">{benefit.description}</p>

                {/* Decorative corner */}
                <div className="absolute top-0 right-0 text-2xl opacity-20 grayscale">⭐</div>
              </div>
            </GlowingShadow>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
