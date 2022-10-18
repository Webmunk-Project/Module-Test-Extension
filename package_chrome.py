import json
import io
import os
import zipfile

manifest = json.load(open('manifest.json'))

def write_to_zip(zip_file, new_file, base_dir=''):
    full_path = '%s/%s' % (base_dir, new_file)

    if base_dir == '':
        full_path = new_file

    if os.path.isdir(full_path):
        for filename in os.listdir(full_path):
            write_to_zip(zip_file, filename, base_dir=full_path)
    elif os.path.isfile(full_path):
        if ('background_loader.js' in full_path) is False and ('content-script.js' in full_path) is False:
            zip_file.write(full_path)


with zipfile.ZipFile('chrome-extension.zip', mode='w') as extension_zip:
    service_worker_scripts = []

    content_script_lines = []

    for extension in manifest.get('webmunk_extensions', []):
        extension_manifest = json.load(open('%s/extension.json' % extension))

        print('Bundling %s...' % extension_manifest.get('name', None))

        for script in extension_manifest.get('service_worker_scripts', []):
            script_filename = '%s/%s' % (extension, script)

            package_filename = 'js/%s/%s' % (extension, script)

            extension_zip.write(script_filename, package_filename)

            service_worker_scripts.append(package_filename)

        for script in extension_manifest.get('content_scripts', []):
            script_filename = '%s/%s' % (extension, script)
            
            print('Reading %s' % script_filename)

            with io.open(script_filename, mode='r', encoding='utf-8') as content_script:
                for content_line in content_script.readlines():
                    content_script_lines.append(content_line)

        for permission in extension_manifest.get('permissions', []):
            if (permission in manifest['permissions']) is False:
                manifest['permissions'].append(permission)

        for permission in extension_manifest.get('host_permissions', []):
            if (permission in manifest['host_permissions']) is False:
                manifest['host_permissions'].append(permission)

    if 'webmunk_extensions' in manifest:
        del manifest['webmunk_extensions']

    extension_zip.writestr('manifest.json', json.dumps(manifest, indent=2))
    extension_zip.write('index.html')

    write_to_zip(extension_zip, 'images')
    write_to_zip(extension_zip, 'js')
    write_to_zip(extension_zip, 'vendor')

    loader_lines = []

    with io.open('js/app/background_loader.js', mode='r', encoding= 'utf-8') as loader_js:
        for line in loader_js.readlines():
            if 'EXTEND SCRIPTS' in line:
                for script in service_worker_scripts:
                    loader_lines.append('scripts.push("../../%s")' % script)

                loader_lines.append('\n')
            else:
                loader_lines.append(line)

    extension_zip.writestr('js/app/background_loader.js', ''.join(loader_lines))

    content_lines = []

    with io.open('js/app/content-script.js', mode='r', encoding= 'utf-8') as content_js:
        for line in content_js.readlines():
            if 'LOAD CONTENT EXTENSIONS' in line:
                for content_line in content_script_lines:
                    content_lines.append(content_line)

                content_lines.append('\n')
            else:
                content_lines.append(line)

    extension_zip.writestr('js/app/content-script.js', ''.join(content_lines))



