<?php

namespace App\Services\Slides;

use App\Services\Media\MediaDescriber;

/**
 * Reads a CSV of hooks into a clean list of lines.
 *
 * Deliberately forgiving about shape, because these files come out of Sheets,
 * Excel and ChatGPT: the delimiter may be a comma or a semicolon, the header may
 * be missing, and the hook column may be called any of half a dozen things.
 */
class HookCsvParser
{
    /** Column names people actually use for the hook, in either language. */
    private const HOOK_HEADERS = ['hook', 'hooks', 'gancho', 'ganchos', 'titulo', 'title', 'texto', 'text', 'frase', 'headline'];

    private const MAX_HOOKS = 200;

    private const MAX_LENGTH = 240;

    /**
     * @return list<string>
     */
    public function parse(string $csv, int $max = self::MAX_HOOKS): array
    {
        $rows = $this->rows($this->stripBom($csv));

        if ($rows === []) {
            return [];
        }

        $column = $this->hookColumn($rows[0]);

        if ($column !== null) {
            array_shift($rows);
        }

        $column ??= 0;
        $hooks = [];
        $seen = [];

        foreach ($rows as $row) {
            $hook = $this->clean($row[$column] ?? '');

            if ($hook === '') {
                continue;
            }

            // Two rows differing only in case or accents are the same hook.
            $key = MediaDescriber::toAscii($hook);

            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $hooks[] = $hook;

            if (count($hooks) >= $max) {
                break;
            }
        }

        return $hooks;
    }

    /**
     * @return list<list<string>>
     */
    private function rows(string $csv): array
    {
        $delimiter = $this->delimiter($csv);
        $handle = fopen('php://temp', 'r+');
        fwrite($handle, $csv);
        rewind($handle);

        $rows = [];

        while (($row = fgetcsv($handle, 0, $delimiter, '"', '\\')) !== false) {
            if ($row === [null] || $row === false) {
                continue;
            }

            $rows[] = array_map(fn ($cell): string => (string) $cell, $row);
        }

        fclose($handle);

        return $rows;
    }

    /**
     * Semicolons win when there are more of them, which is what Excel in a
     * comma-decimal locale produces.
     */
    private function delimiter(string $csv): string
    {
        $sample = mb_substr($csv, 0, 4000);

        return substr_count($sample, ';') > substr_count($sample, ',') ? ';' : ',';
    }

    /**
     * @param  list<string>  $header
     */
    private function hookColumn(array $header): ?int
    {
        foreach ($header as $index => $cell) {
            $name = MediaDescriber::toAscii(trim($cell));

            if (in_array($name, self::HOOK_HEADERS, true)) {
                return $index;
            }
        }

        return null;
    }

    private function clean(string $value): string
    {
        $value = trim(preg_replace('/\s+/u', ' ', $value) ?? '');

        return mb_substr($value, 0, self::MAX_LENGTH);
    }

    private function stripBom(string $csv): string
    {
        return str_starts_with($csv, "\xEF\xBB\xBF") ? substr($csv, 3) : $csv;
    }
}
