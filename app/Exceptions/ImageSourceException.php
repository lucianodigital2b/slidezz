<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when an {@see \App\Contracts\ImageSource} cannot return photos — the
 * provider blocked the request, or the query matched nothing usable.
 */
class ImageSourceException extends RuntimeException {}
