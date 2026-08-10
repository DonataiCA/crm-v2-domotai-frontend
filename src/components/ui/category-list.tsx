"use client";
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface Category {
  id: string | number;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  featured?: boolean;
  rightContent?: React.ReactNode;
}

export interface CategoryListProps {
  title?: string;
  subtitle?: string;
  categories: Category[];
  headerIcon?: React.ReactNode;
  className?: string;
}

export const CategoryList = ({
  title,
  subtitle,
  categories,
  headerIcon,
  className,
}: CategoryListProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | number | null>(null);

  return (
    <div className={cn("w-full", className)}>
      {(title || subtitle) && (
        <div className="mb-6">
          {headerIcon && (
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4 text-primary">
              {headerIcon}
            </div>
          )}
          {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
          {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      )}

      <div className="space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className="relative group"
            onMouseEnter={() => setHoveredItem(category.id)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={category.onClick}
          >
            <div
              className={cn(
                "relative overflow-hidden border bg-card rounded-lg transition-all duration-200 ease-in-out cursor-pointer",
                hoveredItem === category.id
                  ? 'border-primary/50 shadow-sm bg-primary/[0.02]'
                  : 'border-border hover:border-primary/30'
              )}
            >
              {hoveredItem === category.id && (
                <>
                  <div className="absolute top-2.5 left-2.5 w-4 h-4">
                    <div className="absolute top-0 left-0 w-3 h-[2px] bg-primary rounded-full" />
                    <div className="absolute top-0 left-0 w-[2px] h-3 bg-primary rounded-full" />
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 w-4 h-4">
                    <div className="absolute bottom-0 right-0 w-3 h-[2px] bg-primary rounded-full" />
                    <div className="absolute bottom-0 right-0 w-[2px] h-3 bg-primary rounded-full" />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {category.icon && (
                    <div className={cn(
                      "shrink-0 transition-colors duration-200",
                      hoveredItem === category.id ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {category.icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className={cn(
                      "font-semibold transition-colors duration-200",
                      category.featured ? 'text-lg' : 'text-base',
                      hoveredItem === category.id ? 'text-primary' : 'text-foreground'
                    )}>
                      {category.title}
                    </h3>
                    {category.subtitle && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {category.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {category.rightContent && (
                  <div className="shrink-0 ml-3">{category.rightContent}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
