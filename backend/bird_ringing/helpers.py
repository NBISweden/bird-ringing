from pathlib import Path
import os


def get_secret_from_file(env_var_name: str, default: str = None) -> str:
    """
    Reads a secret from a file path defined in an environment variable.
    
    :param env_var_name: Name of the environment variable pointing to the file
    :param default: Optional default if variable is unset or file is unreadable
    :return: The file contents (stripped), or default
    """
    path = os.getenv(env_var_name)
    if path:
        try:
            return Path(path).read_text().strip()
        except FileNotFoundError:
            pass
    return default
