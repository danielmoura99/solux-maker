//components/ui/Card.tsx

import React from "react";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-white shadow-md rounded-lg p-6 ${className}`}>
      {children}
    </div>
  );
}

type CardHeaderProps = {
  children: React.ReactNode;
  className?: string;
};

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

type CardTitleProps = {
  children: React.ReactNode;
  className?: string;
};

export function CardTitle({ children, className = "" }: CardTitleProps) {
  return <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>;
}

type CardContentProps = {
  children: React.ReactNode;
  className?: string;
};

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

type CardFooterProps = {
  children: React.ReactNode;
  className?: string;
};

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return <div className={`mt-4 pt-4 border-t ${className}`}>{children}</div>;
}
