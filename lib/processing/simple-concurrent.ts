/**
 * Simple concurrent processing
 * No global managers, no semaphores, no enterprise theater
 */

/**
 * Process items concurrently with a simple limit
 */
export async function processConcurrently<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  maxConcurrency: number = 3
): Promise<R[]> {
  if (items.length === 0) return [];

  // For small batches, just use Promise.all
  if (items.length <= maxConcurrency) {
    return Promise.all(items.map(processor));
  }

  // Process in chunks
  const results: R[] = new Array(items.length);

  for (let i = 0; i < items.length; i += maxConcurrency) {
    const chunk = items.slice(i, i + maxConcurrency);
    const chunkResults = await Promise.all(
      chunk.map((item, chunkIndex) => processor(item, i + chunkIndex))
    );

    // Put results in correct positions
    chunkResults.forEach((result, chunkIndex) => {
      results[i + chunkIndex] = result;
    });
  }

  return results;
}

/**
 * Process files with progress tracking
 */
export async function processFilesWithLimits<T>(
  files: File[],
  processor: (file: File, index: number) => Promise<T>,
  maxConcurrency: number = 3,
  onProgress?: (completed: number, total: number) => void
): Promise<T[]> {
  let completed = 0;

  const wrappedProcessor = async (file: File, index: number): Promise<T> => {
    try {
      const result = await processor(file, index);
      completed++;
      onProgress?.(completed, files.length);
      console.log(`✅ Processed ${file.name} (${completed}/${files.length})`);
      return result;
    } catch (error) {
      completed++;
      onProgress?.(completed, files.length);
      console.error(`❌ Failed ${file.name} (${completed}/${files.length}):`, error);
      throw error;
    }
  };

  return processConcurrently(files, wrappedProcessor, maxConcurrency);
}