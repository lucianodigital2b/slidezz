<?php

namespace App\Services\Social;

/**
 * An error TikTok answered with, already turned into a message the user can
 * act on (reconnect, try later...).
 */
class TikTokApiException extends \RuntimeException {}
