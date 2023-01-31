# pylint: disable=line-too-long

import argparse
import json
import io
import os
import shutil
import sys
import traceback
import zipfile

parser = argparse.ArgumentParser(description='Packages extension for Chrome distribution.')

parser.add_argument('--dir', action='store_true', help='Generate expanded directory for loading unpacked extensions.')

args = vars(parser.parse_args())

manifest = json.load(io.open('manifest.json', mode='r', encoding='utf-8')) # pylint: disable=consider-using-with

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

    for module in manifest.get('modules', []):
        try:
            module_manifest = json.load(io.open('%s/module.json' % module, mode='r', encoding='utf-8')) # pylint: disable=consider-using-with

            print('Bundling %s...' % module_manifest.get('name', None))

            for script in module_manifest.get('service_worker_scripts', []):
                script_filename = '%s/%s' % (module, script)

                package_filename = 'js/%s/%s' % (module, script)

                extension_zip.write(script_filename, package_filename)

                service_worker_scripts.append(package_filename)

            for script in module_manifest.get('content_include', []):
                script_filename = '%s/%s' % (module, script)

                package_filename = 'js/%s/%s' % (module, script)

                extension_zip.write(script_filename, package_filename)

            for script in module_manifest.get('content_scripts', []):
                script_filename = '%s/%s' % (module, script)

                with io.open(script_filename, mode='r', encoding='utf-8') as content_script:
                    for content_line in content_script.readlines():
                        content_script_lines.append(content_line)

            for permission in module_manifest.get('permissions', []):
                if (permission in manifest['permissions']) is False:
                    manifest['permissions'].append(permission)

            for permission in module_manifest.get('host_permissions', []):
                if (permission in manifest['host_permissions']) is False:
                    manifest['host_permissions'].append(permission)

            action = module_manifest.get('action', None)

            if action is not None:
                manifest['action'] = action

        except: # pylint: disable=bare-except
            print('Error processing %s:' % module)
            traceback.print_exc()

            sys.exit('Unable to proceed.')

    if 'modules' in manifest:
        del manifest['modules']

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

                loader_lines.append('\n')
            else:
                loader_lines.append(line)

    extension_zip.writestr('js/app/background_loader.js', ''.join(loader_lines))

    content_lines = []

    with io.open('js/app/content-script.js', mode='r', encoding= 'utf-8') as content_js:
        for line in content_js.readlines():
            if 'LOAD CONTENT MODULES' in line:
                for content_line in content_script_lines:
                    content_lines.append(content_line)

                content_lines.append('\n')
            else:
                content_lines.append(line)

    extension_zip.writestr('js/app/content-script.js', ''.join(content_lines))

    if args.get('dir', False):
        if os.path.exists('chrome-extension'):
            try:
                shutil.rmtree('chrome-extension')
            except OSError as e:
                print("Error: %s : %s" % ('chrome-extension', e.strerror))

        extension_zip.extractall(path='chrome-extension')
