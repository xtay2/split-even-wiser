export function cls(...classNames: (string | false)[]) {
    return classNames.filter(Boolean).join(' ');
}