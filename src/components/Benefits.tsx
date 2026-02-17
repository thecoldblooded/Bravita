import { Shield, Brain, Heart, Eye, Zap, Bone } from "lucide-react";
import { GlowingShadow } from "@/components/ui/glowing-shadow";
import { useTranslation } from "react-i18next";

const Benefits = () => {
  const { t } = useTranslation();

  const benefits = [
    {
      icon: Shield,
      title: t('benefits.items.immune.title'),
      description: t('benefits.items.immune.desc'),
      color: "bravita-green",
      hex: ["#4ade80", "#22c55e"]
    },
    {
      icon: Brain,
      title: t('benefits.items.nervous.title'),
      description: t('benefits.items.nervous.desc'),
      color: "bravita-teal",
      hex: ["#2dd4bf", "#0d9488"]
    },
    {
      icon: Zap,
      title: t('benefits.items.energy.title'),
      description: t('benefits.items.energy.desc'),
      color: "bravita-orange",
      hex: ["#f97316", "#ea580c"]
    },
    {
      icon: Bone,
      title: t('benefits.items.bone.title'),
      description: t('benefits.items.bone.desc'),
      color: "bravita-yellow",
      hex: ["#facc15", "#eab308"]
    },
    {
      icon: Eye,
      title: t('benefits.items.vision.title'),
      description: t('benefits.items.vision.desc'),
      color: "bravita-blue",
      hex: ["#3b82f6", "#2563eb"]
    },
    {
      icon: Heart,
      title: t('benefits.items.heart.title'),
      description: t('benefits.items.heart.desc'),
      color: "bravita-red",
      hex: ["#ef4444", "#dc2626"]
    }
  ];

  const renderDescription = (text: string) => {
    // Handle both parentheses and dash-separated lists
    const hasParentheses = text.includes('(') && text.includes(')');
    const hasDashList = text.includes(' – ') && text.includes(' ile ');

    let ingredients: string[] = [];
    let mainText = text;

    if (hasParentheses) {
      const parts = text.split(/(\(.*?\))/);
      mainText = "";
      parts.forEach(part => {
        if (part.startsWith('(') && part.endsWith(')')) {
          ingredients = part.slice(1, -1).split(',').map(s => s.trim());
        } else {
          mainText += part;
        }
      });
    } else if (hasDashList) {
      const parts = text.split(' ile ');
      if (parts.length > 1) {
        ingredients = parts[0].split(' – ').map(s => s.trim());
        mainText = parts[1];
      }
    }

    return (
      <div className="flex flex-col h-full w-full">
        <p className="text-gray-600 leading-relaxed text-sm md:text-[15px] mb-6 grow">
          {mainText.trim()}
        </p>

        {ingredients.length > 0 && (
          <div className="mt-auto">
            <div className="flex flex-wrap gap-2">
              {ingredients.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-primary/5 text-primary text-[10px] font-bold tracking-wide border border-primary/10 transition-all hover:bg-primary/10 hover:scale-105 cursor-default"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section id="benefits" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-primary font-bold text-sm uppercase tracking-wider">{t('benefits.badge')}</span>
          <h2 className="text-3xl md:text-5xl font-extrabold mt-2 mb-4">
            {t('benefits.title')} <span className="text-gradient">{t('benefits.title_accent')}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('benefits.description')}
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
                <div className="text-gray-600 leading-relaxed text-base flex-1 flex flex-col w-full">
                  {renderDescription(benefit.description)}
                </div>

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
