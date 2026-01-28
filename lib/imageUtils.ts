import imageCompression from 'browser-image-compression'

/**
 * Compress an image file before uploading
 * @param file - The image file to compress
 * @returns Compressed image file
 */
export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.8, // Target max size: 800KB
    maxWidthOrHeight: 1920, // Max dimension
    useWebWorker: true,
    fileType: file.type,
    initialQuality: 0.8, // 80% quality
  }

  try {
    const compressedFile = await imageCompression(file, options)
    console.log('Image compressed:', {
      originalSize: (file.size / 1024 / 1024).toFixed(2) + 'MB',
      compressedSize: (compressedFile.size / 1024 / 1024).toFixed(2) + 'MB',
      reduction: (((file.size - compressedFile.size) / file.size) * 100).toFixed(1) + '%'
    })
    return compressedFile
  } catch (error) {
    console.error('Image compression failed:', error)
    // Return original file if compression fails
    return file
  }
}

/**
 * Generate a blur data URL for progressive image loading
 * @param width - Width of the blur placeholder
 * @param height - Height of the blur placeholder
 * @returns Base64 encoded blur data URL
 */
export function generateBlurDataURL(width = 10, height = 10): string {
  // Create a tiny canvas for the blur placeholder
  const canvas = typeof window !== 'undefined' ? document.createElement('canvas') : null
  
  if (!canvas) {
    // Fallback for SSR - return a simple gray placeholder
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+'
  }

  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+'
  }

  // Fill with a light gray color
  ctx.fillStyle = '#e5e7eb'
  ctx.fillRect(0, 0, width, height)

  // Add some gradient for a more natural blur effect
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#f3f4f6')
  gradient.addColorStop(1, '#d1d5db')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  return canvas.toDataURL('image/png')
}

/**
 * Get an optimized image URL using Supabase's image transformation API
 * @param baseUrl - The original Supabase image URL
 * @param options - Transformation options (width, height, quality)
 * @returns Optimized image URL with transformation parameters
 */
export function getOptimizedImageUrl(
  baseUrl: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'jpeg'
  } = {}
): string {
  if (!baseUrl) return baseUrl

  // Default values
  const width = options.width || 800
  const height = options.height || 600
  const quality = options.quality || 80
  const format = options.format || 'webp'

  // Check if URL is from Supabase storage
  if (!baseUrl.includes('supabase.co')) {
    return baseUrl
  }

  // Build transformation parameters
  const params = new URLSearchParams()
  params.append('width', width.toString())
  params.append('height', height.toString())
  params.append('quality', quality.toString())
  params.append('format', format)

  // Append parameters to URL
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}${params.toString()}`
}

/**
 * Get thumbnail URL for an image (small size, optimized for lists)
 */
export function getThumbnailUrl(baseUrl: string): string {
  return getOptimizedImageUrl(baseUrl, {
    width: 200,
    height: 200,
    quality: 70,
  })
}

/**
 * Get preview URL for an image (medium size, optimized for cards)
 */
export function getPreviewUrl(baseUrl: string): string {
  return getOptimizedImageUrl(baseUrl, {
    width: 800,
    height: 600,
    quality: 80,
  })
}

/**
 * Get full-size optimized URL for an image
 */
export function getFullSizeUrl(baseUrl: string): string {
  return getOptimizedImageUrl(baseUrl, {
    width: 1920,
    height: 1080,
    quality: 85,
  })
}

/**
 * Validate if a file is a valid image
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  return validTypes.includes(file.type)
}

/**
 * Validate image file size
 * @param file - The file to validate
 * @param maxSizeMB - Maximum allowed size in MB
 */
export function isValidImageSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}
