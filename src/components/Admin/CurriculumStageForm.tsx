// components/Curriculum/CurriculumStageForm.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import {
    FileText,
    Users,
    Calendar,
    Clock,
    BookOpen,
    Code,
    X,
    Save,
    Plus,
    Trash2,
    Upload,
    ChevronDown,
    Search,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AgeRange {
    en: string;
    ar: string;
}

interface AgeCategory {
    _id?: string;
    age_range: AgeRange;
    name_en: string;
    name_ar: string;
    description_en: string;
    description_ar: string;
    order: number;
    icon: string;
}

interface LanguageType {
    value: string;
    en: string;
    ar: string;
}

interface CurriculumStage {
    _id?: string;
    age_category_id?: string;
    age_range: AgeRange | string;
    name_en?: string;
    name_ar?: string;
    title_en: string;
    title_ar: string;
    platform: string;
    language_type: LanguageType | string;
    duration: string;
    lessons_count: number;
    projects_count: number;
    description_en: string;
    description_ar: string;
    media_url?: string;
    order_index: number;
}

interface CurriculumStageFormProps {
    initial?: CurriculumStage;
    categories: AgeCategory[];
    onClose: () => void;
    onSaved: () => void;
    t: (key: string) => string;
}

const CurriculumStageForm = ({ initial, categories, onClose, onSaved, t }: CurriculumStageFormProps) => {
    const [form, setForm] = useState<CurriculumStage>(() => ({
        age_category_id: initial?.age_category_id || '',
        age_range: initial?.age_range || { en: '', ar: '' },
        name_en: initial?.name_en || '',  // من AgeCategory
        name_ar: initial?.name_ar || '',  // من AgeCategory
        title_en: initial?.title_en || '',
        title_ar: initial?.title_ar || '',
        platform: initial?.platform || '',
        language_type: initial?.language_type || { value: '', en: '', ar: '' },
        duration: initial?.duration || '',
        lessons_count: initial?.lessons_count || 0,
        projects_count: initial?.projects_count || 0,
        description_en: initial?.description_en || '',
        description_ar: initial?.description_ar || '',
        media_url: initial?.media_url || '',
        order_index: initial?.order_index || 1,
    }));

    const [loading, setLoading] = useState<boolean>(false);
    const [imagePreview, setImagePreview] = useState<string>('');

    // States for dropdown functionality
    const [platforms, setPlatforms] = useState<string[]>(['Code.org', 'Scratch', 'Replit', 'Python', 'JavaScript', 'HTML/CSS']);
    const [durations, setDurations] = useState<string[]>(['4 weeks', '6 weeks', '8 weeks', '12 weeks', '3 months', '6 months', '1 year']);

    // Platform dropdown states
    const [platformSearch, setPlatformSearch] = useState<string>('');
    const [showPlatformDropdown, setShowPlatformDropdown] = useState<boolean>(false);
    const [customPlatforms, setCustomPlatforms] = useState<string[]>([]);

    // Duration dropdown states
    const [durationSearch, setDurationSearch] = useState<string>('');
    const [showDurationDropdown, setShowDurationDropdown] = useState<boolean>(false);
    const [customDurations, setCustomDurations] = useState<string[]>([]);

    const platformDropdownRef = useRef<HTMLDivElement>(null);
    const durationDropdownRef = useRef<HTMLDivElement>(null);
    const platformInputRef = useRef<HTMLInputElement>(null);
    const durationInputRef = useRef<HTMLInputElement>(null);

    // تعريف language_types باللغتين
    const languageTypes: LanguageType[] = [
        {
            value: 'Block',
            en: 'Block Programming',
            ar: 'برمجة بلوكية'
        },
        {
            value: 'Text',
            en: 'Text Programming',
            ar: 'برمجة نصية'
        }
    ];

    useEffect(() => {
        if (initial?.media_url) {
            setImagePreview(initial.media_url);
        }

        // إذا كان تحرير stage موجود، تأكد من تعيين البيانات بشكل صحيح
        if (initial) {
            // إذا كانت البيانات القديمة تحتوي على age_range كـ string، تحويلها إلى object
            if (initial.age_range && typeof initial.age_range === 'string') {
                const category = categories.find(cat =>
                    cat.age_range?.en === initial.age_range || cat.age_range === initial.age_range
                );
                if (category) {
                    setForm(prev => ({
                        ...prev,
                        age_category_id: category._id,
                        age_range: category.age_range,
                        name_en: category.name_en,
                        name_ar: category.name_ar
                    }));
                }
            }
            // إذا كانت البيانات تحتوي على age_range كـ object
            else if (initial.age_range && typeof initial.age_range === 'object') {
                setForm(prev => ({
                    ...prev,
                    age_range: initial.age_range,
                    name_en: initial.name_en || '',
                    name_ar: initial.name_ar || ''
                }));
            }

            // معالجة language_type القديم
            if (initial.language_type) {
                if (typeof initial.language_type === 'string') {
                    const langType = languageTypes.find(lang => lang.value === initial.language_type);
                    if (langType) {
                        setForm(prev => ({
                            ...prev,
                            language_type: {
                                value: langType.value,
                                en: langType.en,
                                ar: langType.ar
                            }
                        }));
                    }
                }
                // إذا كانت البيانات تحتوي على language_type كـ object
                else if (typeof initial.language_type === 'object') {
                    // إذا كان object بدون value، نضيف value
                    if (!(initial.language_type as LanguageType).value) {
                        const langType = languageTypes.find(lang =>
                            lang.en === (initial.language_type as any).en ||
                            lang.ar === (initial.language_type as any).ar
                        );
                        if (langType) {
                            setForm(prev => ({
                                ...prev,
                                language_type: {
                                    value: langType.value,
                                    en: (initial.language_type as any).en,
                                    ar: (initial.language_type as any).ar
                                }
                            }));
                        }
                    } else {
                        setForm(prev => ({
                            ...prev,
                            language_type: initial.language_type as LanguageType
                        }));
                    }
                }
            }
        }
    }, [initial, categories]);

    // Handle click outside for dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (platformDropdownRef.current && !platformDropdownRef.current.contains(event.target as Node)) {
                setShowPlatformDropdown(false);
            }
            if (durationDropdownRef.current && !durationDropdownRef.current.contains(event.target as Node)) {
                setShowDurationDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const onChange = (field: keyof CurriculumStage, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    // دالة للتعامل مع اختيار الفئة العمرية
    const handleAgeCategoryChange = (categoryId: string) => {
        const selectedCategory = categories.find(cat => cat._id === categoryId);
        if (selectedCategory) {
            setForm(prev => ({
                ...prev,
                age_category_id: categoryId,
                age_range: selectedCategory.age_range,
                name_en: selectedCategory.name_en,
                name_ar: selectedCategory.name_ar
            }));
        }
    };

    // دالة للتعامل مع اختيار نوع اللغة
    const handleLanguageTypeChange = (langValue: string) => {
        const selectedLang = languageTypes.find(lang => lang.value === langValue);
        if (selectedLang) {
            setForm(prev => ({
                ...prev,
                language_type: {
                    value: selectedLang.value,
                    en: selectedLang.en,
                    ar: selectedLang.ar
                }
            }));
        }
    };

    // Platform dropdown functions
    const handlePlatformSelect = (platform: string) => {
        onChange('platform', platform);
        setShowPlatformDropdown(false);
        setPlatformSearch('');
    };

    const handlePlatformInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        onChange('platform', value);
        setPlatformSearch(value);
    };

    const handlePlatformInputFocus = () => {
        setShowPlatformDropdown(true);
    };

    const addCustomPlatform = () => {
        if (platformSearch.trim() && !platforms.includes(platformSearch.trim()) && !customPlatforms.includes(platformSearch.trim())) {
            const newPlatform = platformSearch.trim();
            setCustomPlatforms(prev => [...prev, newPlatform]);
            handlePlatformSelect(newPlatform);
            toast.success(t('curriculum.platformAdded') || 'Platform added successfully');
        }
    };

    // Duration dropdown functions
    const handleDurationSelect = (duration: string) => {
        onChange('duration', duration);
        setShowDurationDropdown(false);
        setDurationSearch('');
    };

    const handleDurationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        onChange('duration', value);
        setDurationSearch(value);
    };

    const handleDurationInputFocus = () => {
        setShowDurationDropdown(true);
    };

    const addCustomDuration = () => {
        if (durationSearch.trim() && !durations.includes(durationSearch.trim()) && !customDurations.includes(durationSearch.trim())) {
            const newDuration = durationSearch.trim();
            setCustomDurations(prev => [...prev, newDuration]);
            handleDurationSelect(newDuration);
            toast.success(t('curriculum.durationAdded') || 'Duration added successfully');
        }
    };

    // Filter functions
    const filteredPlatforms = platforms.filter(platform =>
        platform.toLowerCase().includes(platformSearch.toLowerCase())
    );

    const filteredCustomPlatforms = customPlatforms.filter(platform =>
        platform.toLowerCase().includes(platformSearch.toLowerCase())
    );

    const filteredDurations = durations.filter(duration =>
        duration.toLowerCase().includes(durationSearch.toLowerCase())
    );

    const filteredCustomDurations = customDurations.filter(duration =>
        duration.toLowerCase().includes(durationSearch.toLowerCase())
    );

    const isPlatformInLists = platformSearch.trim() &&
        (filteredPlatforms.some(platform => platform.toLowerCase() === platformSearch.toLowerCase()) ||
            filteredCustomPlatforms.some(platform => platform.toLowerCase() === platformSearch.toLowerCase()));

    const isDurationInLists = durationSearch.trim() &&
        (filteredDurations.some(duration => duration.toLowerCase() === durationSearch.toLowerCase()) ||
            filteredCustomDurations.some(duration => duration.toLowerCase() === durationSearch.toLowerCase()));

    // معالجة رفع الصورة
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setImagePreview(result);
                onChange('media_url', result);
            };
            reader.readAsDataURL(file);
        }
    };

    // دالة مساعدة للحصول على age_range display
    const getAgeRangeDisplay = (ageRange: AgeRange | string): string => {
        if (!ageRange) return '';

        if (typeof ageRange === 'object') {
            return ageRange.en || '';
        }

        return ageRange;
    };

    // دالة للتحقق من صحة النموذج
    const validateForm = (): boolean => {
        if (!form.age_category_id) {
            toast.error('Please select an age range');
            return false;
        }
        if (!form.title_en || !form.title_ar) {
            toast.error('Please enter both English and Arabic titles');
            return false;
        }
        if (!form.platform) {
            toast.error('Please select a platform');
            return false;
        }
        if (!(form.language_type as LanguageType)?.value) {
            toast.error('Please select a language type');
            return false;
        }
        if (!form.duration) {
            toast.error('Please select a duration');
            return false;
        }
        if (!form.lessons_count || form.lessons_count < 0) {
            toast.error('Please enter a valid lessons count');
            return false;
        }
        if (!form.projects_count || form.projects_count < 0) {
            toast.error('Please enter a valid projects count');
            return false;
        }
        if (!form.description_en || !form.description_ar) {
            toast.error('Please enter both English and Arabic descriptions');
            return false;
        }
        return true;
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();

        // التحقق من الصحة قبل الإرسال
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const payload = {
                age_category_id: form.age_category_id,
                age_range: form.age_range,
                name_en: form.name_en,
                name_ar: form.name_ar,
                title_en: form.title_en,
                title_ar: form.title_ar,
                platform: form.platform,
                language_type: form.language_type,
                duration: form.duration,
                lessons_count: parseInt(form.lessons_count.toString()),
                projects_count: parseInt(form.projects_count.toString()),
                description_en: form.description_en,
                description_ar: form.description_ar,
                media_url: form.media_url,
                order_index: parseInt(form.order_index.toString()),
            };

            const method = initial?._id ? 'PUT' : 'POST';
            const url = initial?._id
                ? `/api/curriculum/${initial._id}`
                : `/api/curriculum`;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const responseText = await res.text();

            if (!res.ok) {
                let errorMessage = `HTTP error! status: ${res.status}`;
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    // إذا فشل تحليل JSON، نستخدم الرسالة الافتراضية
                }
                throw new Error(errorMessage);
            }

            const result = JSON.parse(responseText);

            if (result.success) {
                onSaved();
                onClose();
            } else {
                throw new Error(result.message || 'Operation failed');
            }
        } catch (err: unknown) {
            console.error('Error saving stage:', err);
            const errorMessage = err instanceof Error ? err.message : 'An error occurred while saving.';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const getLanguageTypeValue = (languageType: LanguageType | string): LanguageType => {
        if (typeof languageType === 'string') {
            const found = languageTypes.find(lang => lang.value === languageType);
            return found || { value: '', en: '', ar: '' };
        }
        return languageType;
    };

    const currentLanguageType = getLanguageTypeValue(form.language_type);

    return (
        <form onSubmit={submit} className="space-y-6">
            {/* Age Range - فقط الفئات الموجودة في قاعدة البيانات */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                            {t('curriculum.ageGroup') || "Age Group"}
                        </h3>
                        <p className="text-12 text-SlateBlueText dark:text-darktext">
                            {t('curriculum.stageInfo') || "Stage information"}
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                            {t('curriculum.ageGroup') || "Age Range"} *
                        </label>
                        <select
                            value={form.age_category_id}
                            onChange={(e) => handleAgeCategoryChange(e.target.value)}
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                        >
                            <option value="">{t('curriculum.selectAgeRange') || "Select Age Range"}</option>
                            {categories.map(category => (
                                <option key={category._id} value={category._id}>
                                    {getAgeRangeDisplay(category.age_range)} - {category.name_en} / {category.name_ar}
                                </option>
                            ))}
                        </select>

                        {/* عرض البيانات المنسوخة من الفئة العمرية */}
                        {form.age_category_id && (
                            <div className="mt-3 p-3 bg-IcyBreeze dark:bg-dark_input rounded-lg border border-PowderBlueBorder dark:border-dark_border">
                                <h4 className="text-13 font-semibold text-MidnightNavyText dark:text-white mb-2">
                                    {t('curriculum.copiedData') || "Copied from Age Category"}
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-12">
                                    <div>
                                        <span className="text-SlateBlueText dark:text-darktext">Age Range:</span>
                                        <div className="font-medium text-MidnightNavyText dark:text-white">
                                            EN: {(form.age_range as AgeRange)?.en}
                                        </div>
                                        <div className="font-medium text-MidnightNavyText dark:text-white">
                                            AR: {(form.age_range as AgeRange)?.ar}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-SlateBlueText dark:text-darktext">Category Name:</span>
                                        <div className="font-medium text-MidnightNavyText dark:text-white">
                                            EN: {form.name_en}
                                        </div>
                                        <div className="font-medium text-MidnightNavyText dark:text-white">
                                            AR: {form.name_ar}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                            {t('curriculum.displayOrder') || "Display Order"} *
                        </label>
                        <input
                            type="number"
                            value={form.order_index}
                            onChange={(e) => onChange('order_index', parseInt(e.target.value))}
                            min="1"
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                        />
                    </div>
                </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                            {t('curriculum.basicInfo') || "Basic Information"}
                        </h3>
                        <p className="text-12 text-SlateBlueText dark:text-darktext">
                            {t('curriculum.stageDetailsDesc') || 'Stage details'}
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                            {t('curriculum.englishTitle') || "English Title"} *
                        </label>
                        <input
                            type="text"
                            value={form.title_en}
                            onChange={(e) => onChange('title_en', e.target.value)}
                            placeholder={t('curriculum.stageTitleEn') || "Stage title in English"}
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                            {t('curriculum.arabicTitle') || "Arabic Title"} *
                        </label>
                        <input
                            type="text"
                            value={form.title_ar}
                            onChange={(e) => onChange('title_ar', e.target.value)}
                            placeholder={t('curriculum.stageTitleAr') || "Stage title in Arabic"}
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                        />
                    </div>
                </div>

                {/* Stage-specific fields */}
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Platform Dropdown */}
                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                            {t('curriculum.platform') || "Platform"} *
                        </label>
                        <div className="relative" ref={platformDropdownRef}>
                            <div className="relative">
                                <input
                                    ref={platformInputRef}
                                    type="text"
                                    value={form.platform}
                                    onChange={handlePlatformInputChange}
                                    onFocus={handlePlatformInputFocus}
                                    placeholder={t('curriculum.searchPlatform') || "Search or add platform..."}
                                    className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 pr-10"
                                />
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <ChevronDown className="w-4 h-4 text-SlateBlueText dark:text-darktext" />
                                </div>
                            </div>

                            {showPlatformDropdown && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-darkmode border border-PowderBlueBorder dark:border-dark_border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    <div className="p-2 border-b border-PowderBlueBorder dark:border-dark_border">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-SlateBlueText dark:text-darktext" />
                                            <input
                                                type="text"
                                                value={platformSearch}
                                                onChange={(e) => setPlatformSearch(e.target.value)}
                                                placeholder={t('curriculum.searchPlatform') || "Search platforms..."}
                                                className="w-full pl-10 pr-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <div className="py-1">
                                        {platformSearch.trim() && !isPlatformInLists && (
                                            <button
                                                type="button"
                                                onClick={addCustomPlatform}
                                                className="w-full px-3 py-2 text-left hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors duration-200 flex items-center gap-3 text-primary border-b border-PowderBlueBorder dark:border-dark_border"
                                            >
                                                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                                    <Plus className="w-4 h-4 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-13 font-medium text-MidnightNavyText dark:text-white">
                                                        {t('curriculum.addPlatform') || `Add "${platformSearch}"`}
                                                    </p>
                                                    <p className="text-11 text-SlateBlueText dark:text-darktext">
                                                        {t('curriculum.createNewPlatform') || "Create new platform"}
                                                    </p>
                                                </div>
                                            </button>
                                        )}

                                        {filteredPlatforms.length > 0 && (
                                            <div className="border-b border-PowderBlueBorder dark:border-dark_border">
                                                <div className="px-3 py-1 bg-IcyBreeze dark:bg-dark_input">
                                                    <p className="text-11 font-medium text-SlateBlueText dark:text-darktext">
                                                        {t('curriculum.predefinedPlatforms') || "Predefined Platforms"}
                                                    </p>
                                                </div>
                                                {filteredPlatforms.map((platform) => (
                                                    <button
                                                        key={platform}
                                                        type="button"
                                                        onClick={() => handlePlatformSelect(platform)}
                                                        className="w-full px-3 py-2 text-left hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors duration-200 flex items-center gap-3"
                                                    >
                                                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                                            <Code className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-13 font-medium text-MidnightNavyText dark:text-white truncate">
                                                                {platform}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {filteredCustomPlatforms.length > 0 && (
                                            <div>
                                                <div className="px-3 py-1 bg-IcyBreeze dark:bg-dark_input">
                                                    <p className="text-11 font-medium text-SlateBlueText dark:text-darktext">
                                                        {t('curriculum.customPlatforms') || "Custom Platforms"}
                                                    </p>
                                                </div>
                                                {filteredCustomPlatforms.map((platform) => (
                                                    <button
                                                        key={platform}
                                                        type="button"
                                                        onClick={() => handlePlatformSelect(platform)}
                                                        className="w-full px-3 py-2 text-left hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors duration-200 flex items-center gap-3"
                                                    >
                                                        <div className="w-8 h-8 bg-LightYellow/10 rounded-full flex items-center justify-center">
                                                            <Plus className="w-4 h-4 text-LightYellow" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-13 font-medium text-MidnightNavyText dark:text-white truncate">
                                                                {platform}
                                                            </p>
                                                        </div>
                                                        <span className="text-10 px-2 py-1 bg-LightYellow/10 text-LightYellow rounded-full">
                                                            {t('curriculum.custom') || "Custom"}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {filteredPlatforms.length === 0 && filteredCustomPlatforms.length === 0 && !platformSearch.trim() && (
                                            <div className="px-3 py-2 text-13 text-SlateBlueText dark:text-darktext text-center">
                                                {t('curriculum.noPlatforms') || "No platforms available"}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Duration Dropdown */}
                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                            {t('curriculum.duration') || "Duration"} *
                        </label>
                        <div className="relative" ref={durationDropdownRef}>
                            <div className="relative">
                                <input
                                    ref={durationInputRef}
                                    type="text"
                                    value={form.duration}
                                    onChange={handleDurationInputChange}
                                    onFocus={handleDurationInputFocus}
                                    placeholder={t('curriculum.searchDuration') || "Search or add duration..."}
                                    className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 pr-10"
                                />
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <ChevronDown className="w-4 h-4 text-SlateBlueText dark:text-darktext" />
                                </div>
                            </div>

                            {showDurationDropdown && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-darkmode border border-PowderBlueBorder dark:border-dark_border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    <div className="p-2 border-b border-PowderBlueBorder dark:border-dark_border">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-SlateBlueText dark:text-darktext" />
                                            <input
                                                type="text"
                                                value={durationSearch}
                                                onChange={(e) => setDurationSearch(e.target.value)}
                                                placeholder={t('curriculum.searchDuration') || "Search durations..."}
                                                className="w-full pl-10 pr-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <div className="py-1">
                                        {durationSearch.trim() && !isDurationInLists && (
                                            <button
                                                type="button"
                                                onClick={addCustomDuration}
                                                className="w-full px-3 py-2 text-left hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors duration-200 flex items-center gap-3 text-primary border-b border-PowderBlueBorder dark:border-dark_border"
                                            >
                                                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                                    <Plus className="w-4 h-4 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-13 font-medium text-MidnightNavyText dark:text-white">
                                                        {t('curriculum.addDuration') || `Add "${durationSearch}"`}
                                                    </p>
                                                    <p className="text-11 text-SlateBlueText dark:text-darktext">
                                                        {t('curriculum.createNewDuration') || "Create new duration"}
                                                    </p>
                                                </div>
                                            </button>
                                        )}

                                        {filteredDurations.length > 0 && (
                                            <div className="border-b border-PowderBlueBorder dark:border-dark_border">
                                                <div className="px-3 py-1 bg-IcyBreeze dark:bg-dark_input">
                                                    <p className="text-11 font-medium text-SlateBlueText dark:text-darktext">
                                                        {t('curriculum.predefinedDurations') || "Predefined Durations"}
                                                    </p>
                                                </div>
                                                {filteredDurations.map((duration) => (
                                                    <button
                                                        key={duration}
                                                        type="button"
                                                        onClick={() => handleDurationSelect(duration)}
                                                        className="w-full px-3 py-2 text-left hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors duration-200 flex items-center gap-3"
                                                    >
                                                        <div className="w-8 h-8 bg-Aquamarine/10 rounded-full flex items-center justify-center">
                                                            <Clock className="w-4 h-4 text-Aquamarine" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-13 font-medium text-MidnightNavyText dark:text-white truncate">
                                                                {duration}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {filteredCustomDurations.length > 0 && (
                                            <div>
                                                <div className="px-3 py-1 bg-IcyBreeze dark:bg-dark_input">
                                                    <p className="text-11 font-medium text-SlateBlueText dark:text-darktext">
                                                        {t('curriculum.customDurations') || "Custom Durations"}
                                                    </p>
                                                </div>
                                                {filteredCustomDurations.map((duration) => (
                                                    <button
                                                        key={duration}
                                                        type="button"
                                                        onClick={() => handleDurationSelect(duration)}
                                                        className="w-full px-3 py-2 text-left hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors duration-200 flex items-center gap-3"
                                                    >
                                                        <div className="w-8 h-8 bg-LightYellow/10 rounded-full flex items-center justify-center">
                                                            <Plus className="w-4 h-4 text-LightYellow" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-13 font-medium text-MidnightNavyText dark:text-white truncate">
                                                                {duration}
                                                            </p>
                                                        </div>
                                                        <span className="text-10 px-2 py-1 bg-LightYellow/10 text-LightYellow rounded-full">
                                                            {t('curriculum.custom') || "Custom"}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {filteredDurations.length === 0 && filteredCustomDurations.length === 0 && !durationSearch.trim() && (
                                            <div className="px-3 py-2 text-13 text-SlateBlueText dark:text-darktext text-center">
                                                {t('curriculum.noDurations') || "No durations available"}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Duration and Counts for Stages */}
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Language Type */}
                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                            {t('curriculum.languageType') || "Language Type"} *
                        </label>
                        <select
                            value={currentLanguageType.value}
                            onChange={(e) => handleLanguageTypeChange(e.target.value)}
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                        >
                            <option value="">{t('curriculum.selectLanguageType') || "Select Language Type"}</option>
                            {languageTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.en} / {type.ar}
                                </option>
                            ))}
                        </select>

                        {/* عرض البيانات المختارة */}
                        {currentLanguageType.en && (
                            <div className="mt-2 p-2 bg-Aquamarine/10 rounded-lg border border-Aquamarine/20">
                                <div className="text-12 text-SlateBlueText dark:text-darktext">
                                    <strong>Selected Language Type:</strong>
                                </div>
                                <div className="text-12 font-medium text-MidnightNavyText dark:text-white">
                                    EN: {currentLanguageType.en}
                                </div>
                                <div className="text-12 font-medium text-MidnightNavyText dark:text-white">
                                    AR: {currentLanguageType.ar}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                            {t('curriculum.lessonsCount') || "Lessons Count"} *
                        </label>
                        <input
                            type="number"
                            value={form.lessons_count}
                            onChange={(e) => onChange('lessons_count', parseInt(e.target.value))}
                            min="0"
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                            {t('curriculum.projectsCount') || "Projects Count"} *
                        </label>
                        <input
                            type="number"
                            value={form.projects_count}
                            onChange={(e) => onChange('projects_count', parseInt(e.target.value))}
                            min="0"
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                        />
                    </div>
                </div>
            </div>

            {/* Media URL for Stages */}
            <div className="space-y-3">
                <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                    {t('curriculum.media') || "Media (Image/Video)"}
                </label>

                <div className="flex gap-4 items-start">
                    <div className="flex-1">
                        <input
                            type="url"
                            value={form.media_url}
                            onChange={(e) => {
                                onChange('media_url', e.target.value);
                                setImagePreview(e.target.value);
                            }}
                            placeholder="https://example.com/image.jpg"
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                        />
                        <div className="mt-2">
                            <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors">
                                <Upload className="w-3 h-3" />
                                {t('curriculum.uploadImage') || "Upload Image"}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </label>
                            {imagePreview && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange('media_url', '');
                                        setImagePreview('');
                                    }}
                                    className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 cursor-pointer hover:bg-red-500/20 transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    {t('common.remove') || "Remove"}
                                </button>
                            )}
                        </div>
                    </div>

                    {imagePreview && (
                        <div className="w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden">
                            <img
                                src={imagePreview}
                                alt="Media Preview"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Descriptions */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                        {t('curriculum.englishDescription') || "English Description"} *
                    </label>
                    <textarea
                        value={form.description_en}
                        onChange={(e) => onChange('description_en', e.target.value)}
                        rows={3}
                        placeholder={t('curriculum.stageDescriptionEn') || "Stage description in English"}
                        className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                        {t('curriculum.arabicDescription') || "Arabic Description"} *
                    </label>
                    <textarea
                        value={form.description_ar}
                        onChange={(e) => onChange('description_ar', e.target.value)}
                        rows={3}
                        placeholder={t('curriculum.stageDescriptionAr') || "Stage description in Arabic"}
                        className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
                    />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight hover:shadow-md flex items-center justify-center gap-2"
                >
                    <X className="w-3 h-3" />
                    {t('common.cancel') || "Cancel"}
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            {t('common.saving') || "Saving..."}
                        </>
                    ) : initial ? (
                        <>
                            <Save className="w-3 h-3" />
                            {t('curriculum.updateStage') || "Update Stage"}
                        </>
                    ) : (
                        <>
                            <Plus className="w-3 h-3" />
                            {t('curriculum.createStage') || "Create Stage"}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default CurriculumStageForm;