<?php

namespace App\Http\Controllers\Web;

use Inertia\Inertia;
use Inertia\Response;

/**
 * Controller da página de Termos de Uso.
 *
 * Responsabilidade: renderizar a página institucional estática de termos (uso educativo, fontes de
 * dados, isenção de responsabilidade e propriedade intelectual). Não recebe entrada nem consulta
 * serviços: o conteúdo vive no componente Inertia `Terms`, bilíngue via i18n.
 */
class TermsController
{
    public function __invoke(): Response
    {
        return Inertia::render('Terms');
    }
}
