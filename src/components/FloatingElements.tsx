'use client';

import { useEffect, useRef } from 'react';

interface FloatingElement {
  x: number; y: number; size: number;
  speedX: number; speedY: number;
  rotation: number; rotationSpeed: number;
  opacity: number; color: string;
  shape: 'circle' | 'square' | 'triangle';
  blur: number;
}

interface FloatingElementsProps {
  count?: number;
  minBlur?: number;
  maxBlur?: number;
  /** Единый цвет элементов (HEX). null/undefined — дефолтная палитра. */
  color?: string | null;
  /** Форма всех элементов. 'default' — случайная из палитры форм. */
  shape?: 'default' | 'circle' | 'square' | 'triangle';
  /**
   * Держать элементы строго внутри контейнера. По умолчанию false —
   * прежний свободный режим: координаты гуляют от −10% до 110%, а на
   * границе элемент переносится на противоположную сторону (Hero/CTA так и
   * работают — там слой = вся секция, выходить за неё некуда).
   *
   * true — нужно там, где слой привязан к узкой полосе и выход за неё виден
   * (боке между NavLabel «Approach» и «Studio»): стартовая позиция и каждый
   * шаг зажимаются так, чтобы ВНУТРИ оставался весь элемент, а не только его
   * центр, и у стенки скорость отражается, а не телепортируется.
   */
  bounded?: boolean;
}

export function FloatingElements({
  count = 20,
  minBlur = 0,
  maxBlur = 20,
  color,
  shape = 'default',
  bounded = false,
}: FloatingElementsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<FloatingElement[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Проверка prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    // Палитра: зелёный (бренд), лаванда, фиолетовый, кислотно-жёлтый.
    // color из админки переопределяет палитру (решение 7).
    const defaultColors = [
      '#0b6e4f', '#0b6e4f', '#0b6e4f',
      '#a29ffe',
      '#c084fc',
      '#ccff00',
    ];
    const colors = color ? [color] : defaultColors;
    const shapes: Array<'circle' | 'square' | 'triangle'> =
      shape === 'default' ? ['circle', 'square', 'triangle'] : [shape];

    // Габарариты слоя в пикселях — нужны bounded-режиму, чтобы зажимать
    // элемент по его собственному размеру, а не по центру.
    const boxSize = () => ({
      w: container.clientWidth || 1,
      h: container.clientHeight || 1,
    });

    // Предельные координаты ЦЕНТРА элемента в %: половина его размера должна
    // оставаться внутри слоя, иначе квадрат/круг/треугольник торчит за
    // границу. Если элемент сам больше слоя — держим его по центру.
    const limits = (size: number) => {
      const { w, h } = boxSize();
      const mx = w > size * 1.05 ? (size / 2 / w) * 100 : 50;
      const my = h > size * 1.05 ? (size / 2 / h) * 100 : 50;
      return { minX: mx, maxX: 100 - mx, minY: my, maxY: 100 - my };
    };

    const clamp = (v: number, min: number, max: number) =>
      v < min ? min : v > max ? max : v;

    // Инициализация
    elementsRef.current = Array.from({ length: count }, () => {
      const el: FloatingElement = {
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 20 + Math.random() * 80,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.5,
        opacity: 0.1 + Math.random() * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        blur: Math.random() * (maxBlur - minBlur) + minBlur,
      };
      if (bounded) {
        const b = limits(el.size);
        el.x = clamp(el.x, b.minX, b.maxX);
        el.y = clamp(el.y, b.minY, b.maxY);
      }
      return el;
    });

    // Mouse parallax
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current = {
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    const animate = () => {
      elementsRef.current.forEach((el) => {
        el.x += el.speedX;
        el.y += el.speedY;
        el.rotation += el.rotationSpeed;

        if (bounded) {
          // Зажимаем по габаритам самого элемента: половина размера должна
          // оставаться внутри слоя. У стенки скорость ОТРАЖАЕТСЯ (знак меняется)
          // — иначе элемент прилипал бы к краю или телепортировался, и полоса
          // выглядела бы прорезанной. Сдвиг от параллакса ниже делаем до
          // зажима, чтобы он тоже не выносил элемент за границу.
          const b = limits(el.size);

          // Parallax-отталкивание от курсора — сначала, до проверки границ.
          const dx = mouseRef.current.x - el.x;
          const dy = mouseRef.current.y - el.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 30 && dist > 0.001) {
            const force = (30 - dist) / 30;
            el.x -= (dx / dist) * force * 0.5;
            el.y -= (dy / dist) * force * 0.5;
          }

          if (el.x < b.minX) { el.x = b.minX; el.speedX = Math.abs(el.speedX); }
          if (el.x > b.maxX) { el.x = b.maxX; el.speedX = -Math.abs(el.speedX); }
          if (el.y < b.minY) { el.y = b.minY; el.speedY = Math.abs(el.speedY); }
          if (el.y > b.maxY) { el.y = b.maxY; el.speedY = -Math.abs(el.speedY); }
          return;
        }

        if (el.x < -10) el.x = 110;
        if (el.x > 110) el.x = -10;
        if (el.y < -10) el.y = 110;
        if (el.y > 110) el.y = -10;

        // Parallax-отталкивание от курсора
        const dx = mouseRef.current.x - el.x;
        const dy = mouseRef.current.y - el.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 30) {
          const force = (30 - dist) / 30;
          el.x -= (dx / dist) * force * 0.5;
          el.y -= (dy / dist) * force * 0.5;
        }
      });

      // DOM render
      container.innerHTML = '';
      elementsRef.current.forEach((el) => {
        const div = document.createElement('div');
        div.style.cssText = `
          position: absolute; pointer-events: none;
          left: ${el.x}%; top: ${el.y}%;
          width: ${el.size}px; height: ${el.size}px;
          opacity: ${el.opacity};
          transform: translate(-50%, -50%) rotate(${el.rotation}deg);
          filter: blur(${el.blur}px);
        `;

        if (el.shape === 'circle') {
          div.style.borderRadius = '50%';
          div.style.background = el.color;
        } else if (el.shape === 'square') {
          div.style.borderRadius = '12px';
          div.style.background = `linear-gradient(135deg, ${el.color}, transparent)`;
        } else {
          div.style.width = '0';
          div.style.height = '0';
          div.style.borderLeft = `${el.size / 2}px solid transparent`;
          div.style.borderRight = `${el.size / 2}px solid transparent`;
          div.style.borderBottom = `${el.size}px solid ${el.color}`;
          div.style.background = 'none';
        }
        container.appendChild(div);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [count, minBlur, maxBlur, color, shape, bounded]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    />
  );
}
