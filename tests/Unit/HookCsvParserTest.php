<?php

namespace Tests\Unit;

use App\Services\Slides\HookCsvParser;
use PHPUnit\Framework\TestCase;

class HookCsvParserTest extends TestCase
{
    private HookCsvParser $parser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->parser = new HookCsvParser;
    }

    public function test_it_reads_a_hook_column_by_name(): void
    {
        $csv = "id,hook,nota\n1,Estudei 4 anos na Coreia,x\n2,Testei 30 protetores solares,y\n";

        $this->assertSame(
            ['Estudei 4 anos na Coreia', 'Testei 30 protetores solares'],
            $this->parser->parse($csv),
        );
    }

    public function test_it_accepts_portuguese_column_names(): void
    {
        $csv = "gancho;observacao\nMinha rotina de skincare;nada\n";

        $this->assertSame(['Minha rotina de skincare'], $this->parser->parse($csv));
    }

    public function test_it_falls_back_to_the_first_column_without_a_header(): void
    {
        $csv = "Estudei 4 anos na Coreia\nTestei 30 protetores solares\n";

        $this->assertCount(2, $this->parser->parse($csv));
    }

    public function test_it_handles_semicolons_from_excel(): void
    {
        $csv = "hook;categoria\nEstudei 4 anos na Coreia;skincare\nTestei 30 protetores;skincare\n";

        $this->assertSame(
            ['Estudei 4 anos na Coreia', 'Testei 30 protetores'],
            $this->parser->parse($csv),
        );
    }

    public function test_it_keeps_commas_inside_quoted_hooks(): void
    {
        $csv = "hook\n\"Testei 30 produtos, e 3 valem a pena\"\n";

        $this->assertSame(['Testei 30 produtos, e 3 valem a pena'], $this->parser->parse($csv));
    }

    public function test_it_strips_a_utf8_bom_from_the_header(): void
    {
        $csv = "\xEF\xBB\xBFhook\nEstudei 4 anos na Coreia\n";

        $this->assertSame(['Estudei 4 anos na Coreia'], $this->parser->parse($csv));
    }

    public function test_it_keeps_accents_intact(): void
    {
        $csv = "hook\nVocê não precisa de 10 passos\n";

        $this->assertSame(['Você não precisa de 10 passos'], $this->parser->parse($csv));
    }

    public function test_it_drops_blank_rows_and_duplicates(): void
    {
        $csv = "hook\nEstudei 4 anos na Coreia\n\n  \nestudei 4 anos na coreia\nOutro hook\n";

        $this->assertSame(['Estudei 4 anos na Coreia', 'Outro hook'], $this->parser->parse($csv));
    }

    public function test_it_collapses_stray_whitespace(): void
    {
        $csv = "hook\n\"  Estudei   4 anos\tna Coreia  \"\n";

        $this->assertSame(['Estudei 4 anos na Coreia'], $this->parser->parse($csv));
    }

    public function test_it_respects_the_limit(): void
    {
        $rows = implode("\n", array_map(fn (int $i): string => "Hook número {$i}", range(1, 30)));

        $this->assertCount(5, $this->parser->parse("hook\n{$rows}", 5));
    }

    public function test_an_empty_file_yields_no_hooks(): void
    {
        $this->assertSame([], $this->parser->parse(''));
        $this->assertSame([], $this->parser->parse("hook\n"));
    }
}
