"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Check,
  DollarSign,
  ExternalLink,
  Heart,
  ImageIcon,
  Pencil,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingDown,
  Truck,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { searchProducts, optimizeName, optimizeCover, uploadToNaver } from "@/lib/sourcing-api";
import {
  formatKRW,
  parsePrice,
  calculateOptimizedPrice,
  loadPersistedState,
  savePersistedState,
  clearPersistedState,
} from "@/lib/sourcing-utils";
import type { OptimizedPriceResult } from "@/lib/sourcing-utils";
import type { ProductSearchRequest, SourcingProduct } from "@/types/sourcing";

// ---------- Spotlight Search ----------

interface FilterShortcut {
  label: string;
  icon: React.ReactNode;
  value: string;
  type: "sort" | "shipping";
}

const FILTER_SHORTCUTS: FilterShortcut[] = [
  { label: "Free Shipping", icon: <Truck />, value: "free", type: "shipping" },
  { label: "By Sales", icon: <BarChart3 />, value: "sales_rank", type: "sort" },
  {
    label: "Price: Low → High",
    icon: <TrendingDown />,
    value: "price_low",
    type: "sort",
  },
  { label: "Top Reviewed", icon: <Star />, value: "popular", type: "sort" },
];

// ---------- Product Card (image reference style) ----------

function ProductCard({
  product,
  optimizedPrice,
  optimizedName,
  coverImage,
  showOriginalCover,
  onToggleCover,
}: {
  product: SourcingProduct;
  optimizedPrice?: OptimizedPriceResult;
  optimizedName?: string;
  coverImage?: string;
  showOriginalCover?: boolean;
  onToggleCover?: () => void;
}) {
  const tags = [
    product.category,
    product.seller,
    product.shipping_info,
    product.rating > 0 ? `★ ${product.rating.toFixed(1)}` : null,
    product.review_count > 0 ? `${product.review_count} reviews` : null,
  ].filter(Boolean);

  const displayImage = !showOriginalCover && coverImage ? coverImage : product.image_url;

  return (
    <div className="absolute inset-0 flex flex-col rounded-3xl overflow-hidden bg-neutral-900">
      {/* Full-bleed image */}
      <div className="relative flex-1 min-h-0">
        {displayImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={displayImage}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-800">
            <ShoppingBag className="size-16 text-neutral-600" />
          </div>
        )}

        {/* AI Generated badge + toggle */}
        {coverImage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCover?.();
            }}
            className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-emerald-500/80 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            <Sparkles className="!size-3" />
            {showOriginalCover ? "Show AI" : "AI Generated"}
          </button>
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        {/* Link to original product — top-right */}
        {product.url && (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-colors hover:bg-white/30"
            title="View original"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="!size-4 text-white/80" />
          </a>
        )}

        {/* Text overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
          {/* Price */}
          {optimizedPrice ? (
            <div>
              <p className="text-2xl font-bold text-emerald-400 tracking-tight">
                {formatKRW(optimizedPrice.price)}
              </p>
              <p className="text-sm text-white/50 line-through">
                {formatKRW(product.price)}
              </p>
            </div>
          ) : (
            <p className="text-2xl font-bold text-white tracking-tight">
              {formatKRW(product.price)}
            </p>
          )}

          {/* Product name */}
          {optimizedName ? (
            <div className="mt-1">
              <h3 className="text-base font-semibold text-emerald-300 leading-snug line-clamp-2">
                {optimizedName}
              </h3>
              <p className="text-xs text-white/40 line-through line-clamp-1 mt-0.5">
                {product.name}
              </p>
            </div>
          ) : (
            <h3 className="mt-1 text-base font-semibold text-white leading-snug line-clamp-2">
              {product.name}
            </h3>
          )}

          {/* Tag pills */}
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="rounded-full bg-white/15 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-white/90"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Component ----------

export function SourcingClient() {
  const inputRef = useRef<HTMLInputElement>(null);

  // Search form state
  const [keyword, setKeyword] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [freeShipping, setFreeShipping] = useState(false);
  const [sort, setSort] = useState("sales_rank");

  // User pricing settings (loaded from DB)
  const [userFeeRate, setUserFeeRate] = useState(5.0);
  const [userMarginRate, setUserMarginRate] = useState(5.0);

  // Spotlight UI state
  const [hovered, setHovered] = useState(false);
  const [hoveredShortcut, setHoveredShortcut] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [priceInputFocused, setPriceInputFocused] = useState(false);

  // Results state
  const [products, setProducts] = useState<SourcingProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Card swipe state
  const [reviewIndex, setReviewIndex] = useState(0);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(
    null,
  );

  // Optimization state
  const [optimizedPrices, setOptimizedPrices] = useState<Map<string, OptimizedPriceResult>>(new Map());
  const [optimizedNames, setOptimizedNames] = useState<Map<string, string>>(new Map());
  const [nameOptLoading, setNameOptLoading] = useState<Set<string>>(new Set());
  const [coverImages, setCoverImages] = useState<Map<string, string>>(new Map());
  const [coverOptLoading, setCoverOptLoading] = useState<Set<string>>(new Set());
  const [showOriginalCover, setShowOriginalCover] = useState<Set<string>>(new Set());

  // Abort controllers for cancellable generation / upload
  const nameAbortRef = useRef<AbortController | null>(null);
  const coverAbortRef = useRef<AbortController | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const [uploading, setUploading] = useState(false);

  // ---------- Persist & Restore ----------

  const hydrated = useRef(false);

  useEffect(() => {
    const saved = loadPersistedState();
    if (saved) {
      setKeyword(saved.keyword);
      setMinPrice(saved.minPrice);
      setMaxPrice(saved.maxPrice);
      setFreeShipping(saved.freeShipping);
      setSort(saved.sort);
      setProducts(saved.products);
      setAccepted(new Set(saved.accepted));
      setReviewIndex(saved.reviewIndex);
      if (saved.optimizedPrices) setOptimizedPrices(new Map(Object.entries(saved.optimizedPrices)));
      if (saved.optimizedNames) setOptimizedNames(new Map(Object.entries(saved.optimizedNames)));
      if (saved.coverImages) setCoverImages(new Map(Object.entries(saved.coverImages)));
      setHasSearched(true);
    }
    hydrated.current = true;

    // Load user pricing settings from Supabase
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      // Map Supabase auth ID → seller ID → automation config
      const { data: seller } = await supabase
        .from("sellers")
        .select("id")
        .eq("supabase_user_id", user.id)
        .single();
      if (!seller) return;
      const { data: config } = await supabase
        .from("automation_configs")
        .select("naver_fee_rate, min_margin_rate")
        .eq("seller_id", seller.id)
        .single();
      if (config) {
        setUserFeeRate(config.naver_fee_rate);
        setUserMarginRate(config.min_margin_rate);
      }
    }).catch(() => {/* use defaults */});
  }, []);

  useEffect(() => {
    if (!hydrated.current || !hasSearched) return;
    const timer = setTimeout(() => {
      savePersistedState({
        keyword,
        minPrice,
        maxPrice,
        freeShipping,
        sort,
        products,
        accepted: Array.from(accepted),
        reviewIndex,
        optimizedPrices: Object.fromEntries(optimizedPrices),
        optimizedNames: Object.fromEntries(optimizedNames),
        coverImages: Object.fromEntries(coverImages),
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword, minPrice, maxPrice, freeShipping, sort, products, accepted, reviewIndex, hasSearched, optimizedPrices, optimizedNames, coverImages]);

  const currentProduct = useMemo(
    () => (reviewIndex < products.length ? products[reviewIndex] : null),
    [products, reviewIndex],
  );

  const reviewComplete = useMemo(
    () => hasSearched && products.length > 0 && reviewIndex >= products.length,
    [hasSearched, products.length, reviewIndex],
  );

  const isShortcutActive = useCallback(
    (shortcut: FilterShortcut) => {
      if (shortcut.type === "shipping") return freeShipping;
      return sort === shortcut.value;
    },
    [freeShipping, sort],
  );

  const placeholderText = useMemo(() => {
    if (hoveredShortcut !== null) return FILTER_SHORTCUTS[hoveredShortcut].label;
    return "Search products...";
  }, [hoveredShortcut]);

  // ---------- Handlers ----------

  const handleSearch = useCallback(async () => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      toast.error("Please enter a search keyword");
      return;
    }

    const params: ProductSearchRequest = { keyword: trimmed, sort };

    if (minPrice) {
      const num = Number(minPrice);
      if (!Number.isNaN(num) && num >= 10) params.min_price = num;
    }
    if (maxPrice) {
      const num = Number(maxPrice);
      if (!Number.isNaN(num) && num >= 10) params.max_price = num;
    }
    if (params.min_price && params.max_price && params.min_price > params.max_price) {
      toast.error("Min price must be less than max price");
      return;
    }
    if (freeShipping) params.free_shipping = true;

    try {
      setLoading(true);
      setHasSearched(true);
      setAccepted(new Set());
      setReviewIndex(0);
      setExitDirection(null);
      setOptimizedPrices(new Map());
      setOptimizedNames(new Map());
      setCoverImages(new Map());
      setShowOriginalCover(new Set());

      const response = await searchProducts(params);
      const items =
        response.products?.length > 0
          ? response.products
          : (response.items ?? []);
      setProducts(items);

      if (items.length === 0) toast.info("No products found");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [keyword, sort, minPrice, maxPrice, freeShipping]);

  const handleShortcutClick = useCallback(
    (shortcut: FilterShortcut) => {
      if (shortcut.type === "shipping") {
        setFreeShipping((prev) => !prev);
      } else {
        setSort(shortcut.value);
      }
    },
    [],
  );

  const handleSkip = useCallback(() => {
    if (reviewIndex >= products.length) return;
    setExitDirection("left");
    setTimeout(() => {
      setReviewIndex((prev) => prev + 1);
      setExitDirection(null);
    }, 300);
  }, [reviewIndex, products.length]);

  const handleAccept = useCallback(() => {
    if (reviewIndex >= products.length) return;
    const product = products[reviewIndex];
    setAccepted((prev) => new Set(prev).add(product.product_no));
    setExitDirection("right");
    setTimeout(() => {
      setReviewIndex((prev) => prev + 1);
      setExitDirection(null);
    }, 300);
  }, [reviewIndex, products]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!currentProduct) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSkip();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleAccept();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentProduct, handleSkip, handleAccept]);

  // ---------- Bulk Actions ----------

  const allAccepted = useMemo(
    () =>
      products.length > 0 && products.every((p) => accepted.has(p.product_no)),
    [products, accepted],
  );

  const handleAcceptAll = useCallback(() => {
    if (allAccepted) {
      setAccepted(new Set());
      setReviewIndex(0);
      setExitDirection(null);
      toast.success("All products deselected");
    } else {
      const all = new Set(products.map((p) => p.product_no));
      setAccepted(all);
      setReviewIndex(products.length);
      setExitDirection(null);
      toast.success(`All ${products.length} products accepted`);
    }
  }, [products, allAccepted]);

  const resetToInitialState = useCallback(() => {
    clearPersistedState();
    setKeyword("");
    setMinPrice("");
    setMaxPrice("");
    setFreeShipping(false);
    setSort("sales_rank");
    setProducts([]);
    setAccepted(new Set());
    setReviewIndex(0);
    setHasSearched(false);
    setExitDirection(null);
    setOptimizedPrices(new Map());
    setOptimizedNames(new Map());
    setCoverImages(new Map());
    setShowOriginalCover(new Set());
  }, []);

  const handleBulkUpload = useCallback(async () => {
    if (accepted.size === 0) handleAcceptAll();
    const targets = accepted.size > 0
      ? products.filter((p) => accepted.has(p.product_no))
      : products;

    const productsData = targets.map((p) => {
      const data: Record<string, unknown> = { no: p.product_no };
      const optName = optimizedNames.get(p.product_no);
      if (optName) data.title = optName;
      else if (p.name) data.title = p.name;
      const optCover = coverImages.get(p.product_no);
      if (optCover) data.cover_image = optCover;
      else if (p.image_url) data.cover_image = p.image_url;
      return data;
    });

    const controller = new AbortController();
    uploadAbortRef.current = controller;
    setUploading(true);
    const loadingId = toast.loading(
      `Uploading ${targets.length} products to Naver...`,
    );

    try {
      const res = await uploadToNaver(
        {
          products_data: productsData,
          include_details: true,
          naver_fee_rate: userFeeRate / 100,
          min_margin_rate: userMarginRate / 100,
        },
        controller.signal,
      );

      toast.dismiss(loadingId);

      const succeeded = res.results.filter((r) => r.success).length;
      const failed = res.results.filter((r) => !r.success).length;

      if (failed === 0) {
        toast.success(`All ${succeeded} products uploaded to Naver`);
      } else {
        toast.warning(`${succeeded} uploaded, ${failed} failed`, { title: "Partial upload" });
      }

      resetToInitialState();
    } catch (err) {
      toast.dismiss(loadingId);
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.info("Upload cancelled");
        return;
      }
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      uploadAbortRef.current = null;
      setUploading(false);
    }
  }, [accepted, products, handleAcceptAll, optimizedNames, coverImages, userFeeRate, userMarginRate, resetToInitialState]);

  const handleBulkPriceOptimization = useCallback(() => {
    if (accepted.size === 0) handleAcceptAll();
    const targets = accepted.size > 0
      ? products.filter((p) => accepted.has(p.product_no))
      : products;
    setOptimizedPrices((prev) => {
      const next = new Map(prev);
      for (const p of targets) {
        const source = parsePrice(p.price);
        const price = calculateOptimizedPrice(source, userFeeRate, userMarginRate);
        next.set(p.product_no, { price, feeRate: userFeeRate, margin: userMarginRate });
      }
      return next;
    });
    toast.success(`Optimized prices for ${targets.length} products`);
  }, [accepted, products, handleAcceptAll, userFeeRate, userMarginRate]);

  // ---------- Single Name / Cover Handlers ----------

  const handleSingleNameOpt = useCallback(async () => {
    if (!currentProduct) return;
    const id = currentProduct.product_no;

    // If already loading → cancel
    if (nameOptLoading.has(id)) {
      nameAbortRef.current?.abort();
      nameAbortRef.current = null;
      setNameOptLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.info("Name optimization cancelled");
      return;
    }

    const controller = new AbortController();
    nameAbortRef.current = controller;
    setNameOptLoading((prev) => new Set(prev).add(id));
    const loadingId = toast.loading("Optimizing name...");
    try {
      const result = await optimizeName(currentProduct.name, currentProduct.category, controller.signal);
      toast.dismiss(loadingId);
      setOptimizedNames((prev) => new Map(prev).set(id, result));
      toast.success("Name optimized");
    } catch (err) {
      toast.dismiss(loadingId);
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(err instanceof Error ? err.message : "Name optimization failed");
    } finally {
      nameAbortRef.current = null;
      setNameOptLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [currentProduct, nameOptLoading]);

  const handleSingleCoverOpt = useCallback(async () => {
    if (!currentProduct || !currentProduct.image_url) return;
    const id = currentProduct.product_no;

    // If already loading → cancel
    if (coverOptLoading.has(id)) {
      coverAbortRef.current?.abort();
      coverAbortRef.current = null;
      setCoverOptLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.info("Cover optimization cancelled");
      return;
    }

    const controller = new AbortController();
    coverAbortRef.current = controller;
    setCoverOptLoading((prev) => new Set(prev).add(id));
    const loadingId = toast.loading("Optimizing cover image...");
    try {
      const result = await optimizeCover(currentProduct.image_url, currentProduct.name, controller.signal);
      toast.dismiss(loadingId);
      setCoverImages((prev) => new Map(prev).set(id, result.dataUrl));
      toast.success("Cover image optimized");
    } catch (err) {
      toast.dismiss(loadingId);
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(err instanceof Error ? err.message : "Cover optimization failed");
    } finally {
      coverAbortRef.current = null;
      setCoverOptLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [currentProduct, coverOptLoading]);

  const handleToggleCover = useCallback((productNo: string) => {
    setShowOriginalCover((prev) => {
      const next = new Set(prev);
      if (next.has(productNo)) next.delete(productNo);
      else next.add(productNo);
      return next;
    });
  }, []);

  // ---------- Bulk Name / Cover Handlers ----------

  const handleBulkNameOptimization = useCallback(async () => {
    // If already running → cancel
    if (nameAbortRef.current) {
      nameAbortRef.current.abort();
      nameAbortRef.current = null;
      setNameOptLoading(new Set());
      toast.info("Bulk name optimization cancelled");
      return;
    }

    if (accepted.size === 0) handleAcceptAll();
    const targets = accepted.size > 0
      ? products.filter((p) => accepted.has(p.product_no))
      : products;

    const controller = new AbortController();
    nameAbortRef.current = controller;
    const loadingId = toast.loading(`Optimizing names for ${targets.length} products...`);
    let successCount = 0;

    try {
      // Process in batches of 3
      for (let i = 0; i < targets.length; i += 3) {
        if (controller.signal.aborted) break;

        const batch = targets.slice(i, i + 3);
        const ids = batch.map((p) => p.product_no);
        setNameOptLoading((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.add(id);
          return next;
        });

        const results = await Promise.allSettled(
          batch.map((p) => optimizeName(p.name, p.category, controller.signal)),
        );

        setOptimizedNames((prev) => {
          const next = new Map(prev);
          results.forEach((r, idx) => {
            if (r.status === "fulfilled") {
              next.set(batch[idx].product_no, r.value);
              successCount++;
            }
          });
          return next;
        });

        setNameOptLoading((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
      }

      toast.dismiss(loadingId);
      if (!controller.signal.aborted) {
        toast.success(`Optimized ${successCount}/${targets.length} names`);
      }
    } catch {
      toast.dismiss(loadingId);
    } finally {
      nameAbortRef.current = null;
      setNameOptLoading(new Set());
    }
  }, [accepted, products, handleAcceptAll]);

  const handleBulkImageOptimization = useCallback(async () => {
    // If already running → cancel
    if (coverAbortRef.current) {
      coverAbortRef.current.abort();
      coverAbortRef.current = null;
      setCoverOptLoading(new Set());
      toast.info("Bulk cover optimization cancelled");
      return;
    }

    if (accepted.size === 0) handleAcceptAll();
    const targets = (accepted.size > 0
      ? products.filter((p) => accepted.has(p.product_no))
      : products
    ).filter((p) => p.image_url);

    const controller = new AbortController();
    coverAbortRef.current = controller;
    const loadingId = toast.loading(`Optimizing covers for ${targets.length} products...`);
    let successCount = 0;

    try {
      // Process in batches of 3
      for (let i = 0; i < targets.length; i += 3) {
        if (controller.signal.aborted) break;

        const batch = targets.slice(i, i + 3);
        const ids = batch.map((p) => p.product_no);
        setCoverOptLoading((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.add(id);
          return next;
        });

        const results = await Promise.allSettled(
          batch.map((p) => optimizeCover(p.image_url, p.name, controller.signal)),
        );

        setCoverImages((prev) => {
          const next = new Map(prev);
          results.forEach((r, idx) => {
            if (r.status === "fulfilled") {
              next.set(batch[idx].product_no, r.value.dataUrl);
              successCount++;
            }
          });
          return next;
        });

        setCoverOptLoading((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
      }

      toast.dismiss(loadingId);
      if (!controller.signal.aborted) {
        toast.success(`Optimized ${successCount}/${targets.length} covers`);
      }
    } catch {
      toast.dismiss(loadingId);
    } finally {
      coverAbortRef.current = null;
      setCoverOptLoading(new Set());
    }
  }, [accepted, products, handleAcceptAll]);

  const handleDoEverything = useCallback(() => {
    handleAcceptAll();
    toast.success(
      `Running all optimizations + upload for ${products.length} products — coming soon`,
    );
  }, [products, handleAcceptAll]);

  const handleSinglePriceOpt = useCallback(() => {
    if (!currentProduct) return;
    const source = parsePrice(currentProduct.price);
    const price = calculateOptimizedPrice(source, userFeeRate, userMarginRate);
    setOptimizedPrices((prev) => {
      const next = new Map(prev);
      next.set(currentProduct.product_no, { price, feeRate: userFeeRate, margin: userMarginRate });
      return next;
    });
    toast.success(`Optimized price: ${formatKRW(price)}`);
  }, [currentProduct, userFeeRate, userMarginRate]);

  // ---------- Render ----------

  // ---------- Search bar (shared between centered & top layouts) ----------

  const renderSearchBar = (compact = false) => (
    <div
      onMouseEnter={() => {
        clearTimeout(hoverTimeoutRef.current);
        setHovered(true);
      }}
      onMouseLeave={() => {
        hoverTimeoutRef.current = setTimeout(() => {
          if (!priceInputFocused) {
            setHovered(false);
            setHoveredShortcut(null);
          }
        }, 300);
      }}
      className={cn(
        "flex items-start gap-2 z-20 group",
        "[&>div]:bg-neutral-100 [&>div]:text-black [&>div]:rounded-full [&>div]:backdrop-blur-xl",
        compact
          ? "[&_svg]:size-4 [&_svg]:stroke-[1.5]"
          : "[&_svg]:size-5 [&_svg]:stroke-[1.5]",
      )}
    >
      {/* Main search bar */}
      <motion.div
        layout
        transition={{
          layout: { duration: 0.5, type: "spring", bounce: 0.2 },
        }}
        style={{ borderRadius: compact ? "16px" : "22px" }}
        className="h-full w-full flex flex-col items-center justify-start z-10 relative overflow-hidden border border-border/60 bg-neutral-100"
      >
        {/* Input row */}
        <div className={cn("flex items-center w-full gap-2 px-4", compact ? "h-8" : "h-11")}>
          <motion.div layoutId="sourcing-search-icon">
            <Search />
          </motion.div>
          <div className={cn("flex-1 relative", compact ? "text-xs" : "text-sm")}>
            {!keyword && (
              <AnimatePresence mode="popLayout">
                <motion.p
                  key={placeholderText}
                  initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(5px)" }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute text-gray-500 flex items-center pointer-events-none z-10"
                >
                  {placeholderText}
                </motion.p>
              </AnimatePresence>
            )}
            <motion.input
              ref={inputRef}
              layout="position"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) void handleSearch();
              }}
              className="w-full bg-transparent outline-none"
            />
          </div>
        </div>
      </motion.div>

      {/* Animated shortcut buttons (blob-emerge on hover) */}
      <AnimatePresence mode="popLayout">
        {hovered &&
          FILTER_SHORTCUTS.map((shortcut, index) => (
            <motion.div
              key={shortcut.value}
              onMouseEnter={() => setHoveredShortcut(index)}
              layout
              initial={{ scale: 0.7, x: -1 * ((compact ? 28 : 40) * (index + 1)) }}
              animate={{ scale: 1, x: 0 }}
              exit={{
                scale: 0.7,
                x:
                  1 *
                  ((compact ? 6 : 8) * (FILTER_SHORTCUTS.length - index - 1) +
                    (compact ? 28 : 40) * (FILTER_SHORTCUTS.length - index - 1)),
              }}
              transition={{
                duration: 0.8,
                type: "spring",
                bounce: 0.2,
                delay: index * 0.05,
              }}
              className="rounded-full cursor-pointer"
              onClick={() => handleShortcutClick(shortcut)}
            >
              <div
                className={cn(
                  "aspect-square flex items-center justify-center rounded-full transition-[opacity,shadow] duration-200",
                  compact ? "size-7" : "size-10",
                  isShortcutActive(shortcut)
                    ? "opacity-100 shadow-lg ring-2 ring-black/20"
                    : "opacity-30 hover:opacity-100 hover:shadow-lg",
                )}
              >
                {shortcut.icon}
              </div>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );

  const priceRangeInvalid = useMemo(() => {
    const min = Number(minPrice);
    const max = Number(maxPrice);
    return minPrice && maxPrice && !Number.isNaN(min) && !Number.isNaN(max) && min > 0 && max > 0 && min > max;
  }, [minPrice, maxPrice]);

  const priceFilters = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Min ₩</span>
        <input
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          onFocus={() => { clearTimeout(hoverTimeoutRef.current); setPriceInputFocused(true); setHovered(true); }}
          onBlur={() => { setPriceInputFocused(false); hoverTimeoutRef.current = setTimeout(() => { setHovered(false); setHoveredShortcut(null); }, 300); }}
          placeholder="0"
          className={cn(
            "w-20 rounded-md border bg-transparent px-2 py-1 text-xs outline-none focus:border-ring",
            priceRangeInvalid ? "border-red-400 text-red-600" : "border-border",
          )}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Max ₩</span>
        <input
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          onFocus={() => { clearTimeout(hoverTimeoutRef.current); setPriceInputFocused(true); setHovered(true); }}
          onBlur={() => { setPriceInputFocused(false); hoverTimeoutRef.current = setTimeout(() => { setHovered(false); setHoveredShortcut(null); }, 300); }}
          placeholder="No limit"
          className={cn(
            "w-20 rounded-md border bg-transparent px-2 py-1 text-xs outline-none focus:border-ring",
            priceRangeInvalid ? "border-red-400 text-red-600" : "border-border",
          )}
        />
      </div>
      {priceRangeInvalid && (
        <span className="text-[10px] text-red-500 font-medium">Min must be ≤ Max</span>
      )}
      {(freeShipping || sort !== "sales_rank") && (
        <>
          <div className="h-4 w-px bg-border" />
          {freeShipping && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              <Truck className="!size-3 !stroke-[2]" /> Free Shipping
            </span>
          )}
          {sort !== "sales_rank" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              {FILTER_SHORTCUTS.find((s) => s.value === sort)?.label ?? sort}
            </span>
          )}
        </>
      )}
    </div>
  );

  // ---------- Centered welcome state (before search) ----------

  if (!hasSearched && !loading) {
    return (
      <div className="relative flex h-[calc(100vh-4rem)] flex-col items-center justify-center mx-auto overflow-hidden">
        <div className="flex flex-col items-center gap-5 w-full max-w-xl px-4">
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              Product Sourcing
            </h1>
            <p className="text-sm text-muted-foreground">
              Search products from the market and upload to your Naver store.
            </p>
          </div>

          <div className="w-full">{renderSearchBar(false)}</div>
          <div className="flex justify-center">{priceFilters}</div>
        </div>

      </div>
    );
  }

  // ---------- Results layout (after search) ----------

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] flex-col gap-3 mx-auto overflow-x-hidden overflow-y-auto lg:overflow-hidden px-4 lg:px-10">
      {/* ── Compact search bar centered ── */}
      <div className="flex-shrink-0 flex items-center justify-center pt-1">
        <div className="w-full max-w-xs">{renderSearchBar(true)}</div>
      </div>
      <div className="flex-shrink-0 flex justify-center -mt-2">{priceFilters}</div>

      {/* ── Results: List + Card Swipe ── */}
      {loading ? (
        <div className="flex min-h-0 flex-1 flex-col items-center gap-4 lg:flex-row lg:justify-center lg:gap-8">
          <div className="w-full max-w-[640px] lg:flex-1 lg:min-w-0 flex flex-col gap-2 order-2 lg:order-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
          <div className="flex flex-col items-center gap-3 order-1 lg:order-2">
            <Skeleton className="h-[60vh] w-full max-w-[500px] lg:h-[680px] lg:w-[500px] rounded-2xl" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="size-11 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      ) : hasSearched && products.length > 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center gap-4 pb-4 lg:flex-row lg:justify-center lg:gap-8 lg:pb-0">
          {/* ── Left: Product List ── */}
          <div
            className="relative flex w-full max-w-[640px] lg:flex-1 lg:min-w-0 h-[60vh] lg:h-[680px] flex-col rounded-xl border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,.06),0_6px_16px_rgba(0,0,0,.06)] order-2 lg:order-1"
          >
            {/* List header */}
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
              <span className="text-xs font-semibold text-foreground">
                {products.length} products
              </span>
              <span className="text-xs text-emerald-600 font-medium">
                {accepted.size} accepted
              </span>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {products.map((product, index) => {
                const isActive = index === reviewIndex && !reviewComplete;
                const isAccepted = accepted.has(product.product_no);
                const isReviewed = index < reviewIndex;

                return (
                  <button
                    key={`${product.product_no}-${index}`}
                    type="button"
                    onClick={() => {
                      setReviewIndex(index);
                      setExitDirection(null);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-border/20 last:border-b-0",
                      isActive
                        ? "bg-emerald-50/80"
                        : "hover:bg-neutral-50/80",
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="relative size-16 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100">
                      {product.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={product.image_url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingBag className="size-3.5 text-muted-foreground/40" />
                        </div>
                      )}
                      {isAccepted && (
                        <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/80">
                          <Heart className="!size-3.5 text-white fill-white" />
                        </div>
                      )}
                      {isReviewed && !isAccepted && (
                        <div className="absolute inset-0 flex items-center justify-center bg-neutral-500/60">
                          <X className="!size-3.5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      {optimizedNames.has(product.product_no) ? (
                        <p className="text-xs font-medium leading-tight line-clamp-1 text-emerald-700">
                          {optimizedNames.get(product.product_no)}
                        </p>
                      ) : (
                        <p className="text-xs font-medium leading-tight line-clamp-1 text-foreground">
                          {product.name}
                        </p>
                      )}
                      {optimizedPrices.has(product.product_no) ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-semibold text-emerald-600">
                            {formatKRW(optimizedPrices.get(product.product_no)!.price)}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60 line-through">
                            {formatKRW(product.price)}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                          {formatKRW(product.price)}
                        </p>
                      )}
                    </div>

                    {isActive && (
                      <div className="size-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Bulk Actions Footer ── */}
            <div className="flex-shrink-0 border-t border-border/40 px-3 py-2.5 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-0.5">
                Quick actions — all {products.length}
              </p>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={handleAcceptAll}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                    allAccepted
                      ? "bg-red-50 text-red-700 hover:bg-red-100"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                  )}
                >
                  {allAccepted ? (
                    <X className="!size-3.5" />
                  ) : (
                    <Heart className="!size-3.5" />
                  )}
                  {allAccepted ? "Deselect All" : "Accept All"}
                </button>
                <button
                  onClick={() => {
                    if (uploading) {
                      uploadAbortRef.current?.abort();
                      uploadAbortRef.current = null;
                      setUploading(false);
                      return;
                    }
                    handleBulkUpload();
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                    uploading
                      ? "bg-red-50 text-red-700 hover:bg-red-100"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100",
                  )}
                >
                  {uploading ? (
                    <X className="!size-3.5" />
                  ) : (
                    <Upload className="!size-3.5" />
                  )}
                  {uploading ? "Cancel" : "Upload All"}
                </button>
                <button
                  onClick={handleBulkPriceOptimization}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100"
                >
                  <DollarSign className="!size-3.5" />
                  Price Opt.
                </button>
                <button
                  onClick={handleBulkNameOptimization}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                    nameOptLoading.size > 0
                      ? "bg-red-50 text-red-700 hover:bg-red-100"
                      : "bg-violet-50 text-violet-700 hover:bg-violet-100",
                  )}
                >
                  {nameOptLoading.size > 0 ? (
                    <X className="!size-3.5" />
                  ) : (
                    <Pencil className="!size-3.5" />
                  )}
                  {nameOptLoading.size > 0 ? "Cancel" : "Name Opt."}
                </button>
                <button
                  onClick={handleBulkImageOptimization}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                    coverOptLoading.size > 0
                      ? "bg-red-50 text-red-700 hover:bg-red-100"
                      : "bg-pink-50 text-pink-700 hover:bg-pink-100",
                  )}
                >
                  {coverOptLoading.size > 0 ? (
                    <X className="!size-3.5" />
                  ) : (
                    <ImageIcon className="!size-3.5" />
                  )}
                  {coverOptLoading.size > 0 ? "Cancel" : "Cover Opt."}
                </button>
                <button
                  onClick={handleDoEverything}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors bg-neutral-900 text-white hover:bg-neutral-800"
                >
                  <Zap className="!size-3" />
                  Everything
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: Card Swipe ── */}
          {!reviewComplete ? (
            <div className="flex flex-col items-center justify-center gap-3 order-1 lg:order-2 lg:h-[680px] lg:flex-shrink-0">
              {/* Progress */}
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <span>
                  {reviewIndex + 1} / {products.length}
                </span>
                <div className="h-3.5 w-px bg-border" />
                <span className="text-emerald-600 font-medium">
                  {accepted.size} accepted
                </span>
              </div>

              {/* Card — sized to fit viewport */}
              <div
                className="relative w-full max-w-[500px] lg:w-[500px] h-[50vh] lg:h-[680px] rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,.06),0_6px_16px_rgba(0,0,0,.06)]"
                style={{ perspective: "1200px" }}
              >
                <AnimatePresence mode="wait">
                  {currentProduct && !exitDirection && (
                    <motion.div
                      key={currentProduct.product_no}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="absolute inset-0"
                    >
                      <ProductCard
                        product={currentProduct}
                        optimizedPrice={optimizedPrices.get(currentProduct.product_no)}
                        optimizedName={optimizedNames.get(currentProduct.product_no)}
                        coverImage={coverImages.get(currentProduct.product_no)}
                        showOriginalCover={showOriginalCover.has(currentProduct.product_no)}
                        onToggleCover={() => handleToggleCover(currentProduct.product_no)}
                      />
                    </motion.div>
                  )}

                  {currentProduct && exitDirection && (
                    <motion.div
                      key={`${currentProduct.product_no}-exit`}
                      initial={{ opacity: 1, x: 0, rotateY: 0 }}
                      animate={{
                        opacity: 0,
                        x: exitDirection === "left" ? -300 : 300,
                        rotateY: exitDirection === "left" ? -15 : 15,
                      }}
                      transition={{ duration: 0.3, ease: "easeIn" }}
                      className={cn(
                        "absolute inset-0 rounded-3xl",
                        exitDirection === "right" && "ring-3 ring-emerald-400",
                        exitDirection === "left" && "ring-3 ring-red-400",
                      )}
                    >
                      <ProductCard
                        product={currentProduct}
                        optimizedPrice={optimizedPrices.get(currentProduct.product_no)}
                        optimizedName={optimizedNames.get(currentProduct.product_no)}
                        coverImage={coverImages.get(currentProduct.product_no)}
                        showOriginalCover={showOriginalCover.has(currentProduct.product_no)}
                        onToggleCover={() => handleToggleCover(currentProduct.product_no)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action buttons — tighter */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleSkip}
                  className="group flex size-11 items-center justify-center rounded-full border-2 border-neutral-200 bg-white transition-all hover:border-red-400 hover:bg-red-50 hover:scale-110 active:scale-95"
                  aria-label="Skip product"
                  title="Skip"
                >
                  <X className="!size-4.5 text-neutral-400 group-hover:text-red-500 transition-colors" />
                </button>

                <button
                  onClick={handleSinglePriceOpt}
                  className="group flex size-12 items-center justify-center rounded-full bg-amber-500 text-white transition-all hover:bg-amber-600 hover:scale-110 active:scale-95 shadow-lg shadow-amber-500/25"
                  aria-label="Price optimization"
                  title="Price Optimization"
                >
                  <DollarSign className="!size-5" />
                </button>

                <button
                  onClick={handleSingleNameOpt}
                  className={cn(
                    "group flex size-12 items-center justify-center rounded-full text-white transition-all hover:scale-110 active:scale-95 shadow-lg",
                    currentProduct && nameOptLoading.has(currentProduct.product_no)
                      ? "bg-red-500 hover:bg-red-600 shadow-red-500/25"
                      : "bg-violet-500 hover:bg-violet-600 shadow-violet-500/25",
                  )}
                  aria-label={currentProduct && nameOptLoading.has(currentProduct.product_no) ? "Cancel name optimization" : "Name optimization"}
                  title={currentProduct && nameOptLoading.has(currentProduct.product_no) ? "Cancel" : "Name Optimization"}
                >
                  {currentProduct && nameOptLoading.has(currentProduct.product_no) ? (
                    <X className="!size-5" />
                  ) : (
                    <Pencil className="!size-5" />
                  )}
                </button>

                <button
                  onClick={handleSingleCoverOpt}
                  className={cn(
                    "group flex size-12 items-center justify-center rounded-full text-white transition-all hover:scale-110 active:scale-95 shadow-lg",
                    currentProduct && coverOptLoading.has(currentProduct.product_no)
                      ? "bg-red-500 hover:bg-red-600 shadow-red-500/25"
                      : "bg-pink-500 hover:bg-pink-600 shadow-pink-500/25",
                  )}
                  aria-label={currentProduct && coverOptLoading.has(currentProduct.product_no) ? "Cancel cover optimization" : "Cover image optimization"}
                  title={currentProduct && coverOptLoading.has(currentProduct.product_no) ? "Cancel" : "Cover Image Optimization"}
                >
                  {currentProduct && coverOptLoading.has(currentProduct.product_no) ? (
                    <X className="!size-5" />
                  ) : (
                    <ImageIcon className="!size-5" />
                  )}
                </button>

                <button
                  onClick={handleAccept}
                  className="group flex size-11 items-center justify-center rounded-full border-2 border-neutral-200 bg-white transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:scale-110 active:scale-95"
                  aria-label="Accept product"
                  title="Accept"
                >
                  <Heart className="!size-4.5 text-neutral-400 group-hover:text-emerald-500 transition-colors" />
                </button>
              </div>

              <p className="text-[10px] text-muted-foreground/40">
                ← Skip · Accept →
              </p>
            </div>
          ) : (
            /* ── Review Complete ── */
            <div className="flex w-full max-w-[500px] lg:w-[500px] h-[60vh] lg:h-[680px] flex-col items-center justify-center gap-3 order-1 lg:order-2 lg:flex-shrink-0">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100">
                <Check className="size-7 text-emerald-600" />
              </div>
              <h3 className="text-base font-semibold">Review Complete</h3>
              <p className="text-sm text-muted-foreground">
                You accepted{" "}
                <span className="font-semibold text-emerald-600">
                  {accepted.size}
                </span>{" "}
                out of {products.length} products.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReviewIndex(0);
                  setAccepted(new Set());
                  setExitDirection(null);
                }}
              >
                Review Again
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-neutral-100">
              <Search className="size-7 text-muted-foreground/40" />
            </div>
            <p className="mt-4 text-sm font-semibold text-foreground">
              No products found
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting your search keyword or filters.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
