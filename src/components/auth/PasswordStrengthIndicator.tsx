import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface PasswordStrengthIndicatorProps {
    password: string;
}

interface PasswordRule {
    key: string;
    test: (password: string) => boolean;
}

const passwordRules: PasswordRule[] = [
    {
        key: "min_chars",
        test: (p) => p.length >= 12,
    },
    {
        key: "uppercase",
        test: (p) => /[A-Z]/.test(p),
    },
    {
        key: "lowercase",
        test: (p) => /[a-z]/.test(p),
    },
    {
        key: "number",
        test: (p) => /[0-9]/.test(p),
    },
    {
        key: "special",
        test: (p) => /[!@#$%^&*]/.test(p),
    },
];

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
    const { t } = useTranslation();

    const results = useMemo(() => {
        return passwordRules.map((rule) => ({
            ...rule,
            passed: rule.test(password),
            label: t(`auth.password_strength.rules.${rule.key}`),
        }));
    }, [password, t]);

    const passedCount = results.filter((r) => r.passed).length;
    const totalRules = passwordRules.length;
    const strengthPercentage = (passedCount / totalRules) * 100;

    const getStrengthColor = () => {
        if (strengthPercentage === 100) return "bg-green-500";
        if (strengthPercentage >= 60) return "bg-yellow-500";
        if (strengthPercentage >= 40) return "bg-orange-500";
        return "bg-red-500";
    };

    const getStrengthText = () => {
        if (strengthPercentage === 100) return t("auth.password_strength.strong");
        if (strengthPercentage >= 60) return t("auth.password_strength.medium");
        if (strengthPercentage >= 40) return t("auth.password_strength.weak");
        return t("auth.password_strength.very_weak");
    };

    if (!password) return null;

    return (
        <div className="mt-3 space-y-3">
            {/* Strength Bar */}
            <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">{t("auth.password_strength.label")}</span>
                    <span className={cn(
                        "font-medium",
                        strengthPercentage === 100 ? "text-green-600" :
                            strengthPercentage >= 60 ? "text-yellow-600" :
                                strengthPercentage >= 40 ? "text-orange-600" : "text-red-600"
                    )}>
                        {getStrengthText()}
                    </span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full transition-all duration-300 rounded-full", getStrengthColor())}
                        style={{ width: `${strengthPercentage}%` }}
                    />
                </div>
            </div>

            {/* Rules Checklist */}
            <div className="grid grid-cols-1 gap-1">
                {results.map((rule) => (
                    <div
                        key={rule.key}
                        className={cn(
                            "flex items-center gap-2 text-xs transition-colors duration-200",
                            rule.passed ? "text-green-600" : "text-gray-400"
                        )}
                    >
                        {rule.passed ? (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                            <X className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{rule.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
