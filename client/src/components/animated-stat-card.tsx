import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";

interface AnimatedStatCardProps {
  title: string;
  value: number;
  previousValue?: number;
  icon: LucideIcon;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  iconColor?: string;
}

export function AnimatedStatCard({
  title,
  value,
  previousValue,
  icon: Icon,
  prefix = "",
  suffix = "",
  decimals = 0,
  iconColor = "text-muted-foreground",
}: AnimatedStatCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const spring = useSpring(0, {
    bounce: 0,
    duration: 2000,
  });

  const display = useTransform(spring, (latest) => {
    return prefix + latest.toFixed(decimals) + suffix;
  });

  useEffect(() => {
    if (isVisible) {
      spring.set(value);
    }
  }, [spring, value, isVisible]);

  const getTrendInfo = () => {
    if (previousValue === undefined || previousValue === 0) {
      return null;
    }

    const change = ((value - previousValue) / previousValue) * 100;
    const isPositive = change > 0;
    const isNeutral = Math.abs(change) < 0.1;

    if (isNeutral) {
      return {
        icon: Minus,
        text: "No change",
        color: "text-muted-foreground",
      };
    }

    return {
      icon: isPositive ? TrendingUp : TrendingDown,
      text: `${isPositive ? "+" : ""}${change.toFixed(1)}% from last period`,
      color: isPositive ? "text-green-600" : "text-red-600",
    };
  };

  const trend = getTrendInfo();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <motion.div
          className="text-2xl font-bold"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {isVisible ? <motion.span>{display}</motion.span> : `${prefix}0${suffix}`}
        </motion.div>

        {trend && (
          <motion.div
            className="flex items-center gap-1 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <trend.icon className={`h-3 w-3 ${trend.color}`} />
            <p className={`text-xs ${trend.color}`}>{trend.text}</p>
          </motion.div>
        )}

        {!trend && previousValue !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">Based on recent activity</p>
        )}
      </CardContent>
    </Card>
  );
}
