<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a file cannot be taken into the media library — the download failed,
 * or the bytes are not a decodable image.
 */
class MediaLibraryException extends RuntimeException {}
